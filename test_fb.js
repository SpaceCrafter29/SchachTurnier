import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const app = initializeApp({ projectId: "strategic-bus-gtgzl", appId: "1:223160037293:web:05722321bf1f676a477b24", apiKey: "AIzaSyAnnacfE_oBHBFAVytJfB2jjYyg883PpZ0" });
const db = getFirestore(app, "ai-studio-ae9706c1-9a01-400b-b585-6db71a52287f");
console.log(db.type);
