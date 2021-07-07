import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";

let firebaseConfig = {
  apiKey: "AIzaSyCZlNDuswROsw0py-e_eG-lF7FwjVPlTi8",
  authDomain: "test-udemy-firesstore.firebaseapp.com",
  projectId: "test-udemy-firesstore",
  storageBucket: "test-udemy-firesstore.appspot.com",
  messagingSenderId: "86974808628",
  appId: "1:86974808628:web:d14154f9d3c8df1a484061",
  measurementId: "G-M62K2NC4HG"
};

const firebaseApp = !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();
const db = firebaseApp.firestore();
const auth = firebaseApp.auth();
const storage = firebaseApp.storage();

export const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
  window.location.reload();
}

export const checkAuth = (cb) => {
  return auth.onAuthStateChanged(cb);
}

export const logOut = async () => {
  await auth.signOut();
  window.location.reload();
}

export const getCollection = async (id) => {
  const snapshot = await db.collection(id).get()
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(data);
}

export const getUserLists = async (userId) => {
  const snapshot = await db.collection('lists')
    // .where('author', '==', userId)
    .where('userIds', 'array-contains', userId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

const uploadCoverImage = (file) => {
  const uploadTask = storage.ref(`images/${file.name}-${file.lastModified}`)
    .put(file);
  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => console.log("image uploading", snapshot),
      reject,
      () => {
        storage.ref('images').child(`${file.name}-${file.lastModified}`).getDownloadURL().then(resolve)
      }
    );
  })
}

export const createList = async (list, user) => {
  const { name, description, image } = list
  await db.collection('lists').add({
    name,
    description,
    image: image ? await uploadCoverImage(image) : null,
    created: firebase.firestore.FieldValue.serverTimestamp(),
    author: user.uid,
    userIds: [user.uid],
    users: [
      {
        id: user.uid,
        name: user.displayName,
      }
    ]
  })
}

export const getList = async (listId) => {
  try {
    const list = await db.collection('lists').doc(listId).get();
    if (!list.exists) throw Error(`List doesn't exist`);
    return list.data();
  } catch (error) {
    console.error(error);
    throw Error(error)
  }
}

export const createListItem = async ({ user, listId, item }) => {
  try {
    const response = await fetch(`https://screenshotapi.net/api/v1/screenshot?url=${item.link}&token=DOBRJHGKLUUHMZIQKKVSB1BPGHDCFHMJ`)
    const { screenshot } = await response.json();

    await db.collection('lists').doc(listId).collection('items').add({
      name: item.name,
      link: item.link,
      image: screenshot,
      created: firebase.firestore.FieldValue.serverTimestamp(),
      author: {
        id: user.uid,
        username: user.displayName
      }
    })
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

export const subscribeToListItems = async (listId, cb) => {
  return db.collection('lists')
    .doc(listId)
    .collection('items')
    .orderBy('created', 'desc')
    .onSnapshot(cb)
}

export const deleteListItem = async (listId, itemId) => {
  return db.collection('lists')
    .doc(listId)
    .collection('items')
    .doc(itemId)
    .delete()
}

export const addUserToList = async (user, listId) => {
  await db.collection('lists').doc(listId).update({
    userIds: firebase.firestore.FieldValue.arrayUnion(user.uid),
    users: firebase.firestore.FieldValue.arrayUnion({
      id: user.uid,
      name: user.displayName
    })
  })
  window.location.reload();
}