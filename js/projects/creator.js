import { app, checkAuth } from '../auth.js';
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const db = getFirestore(app);
const APP_ID = 'noppo-drive-ultimate';

const trigger = document.getElementById('trigger-create');
const modal = document.getElementById('modal-overlay');
const closeBtn = document.getElementById('close-modal');
const createBtn = document.getElementById('btn-create-final');

if (trigger && modal) {
    trigger.onclick = () => {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
    };
}

if (closeBtn) {
    closeBtn.onclick = () => {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };
}

if (createBtn) {
    createBtn.onclick = async () => {
        const user = await checkAuth();
        const name = document.getElementById('in-project-name').value.trim();
        if (!name || !user) return;

        createBtn.disabled = true;
        createBtn.innerText = "作成中...";

        try {
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'items'), {
                name: name,
                type: 'folder',
                ownerId: user.userId,
                createdAt: serverTimestamp(),
                parentId: 'root' // AIHubのルート階層
            });
            location.reload();
        } catch (e) {
            console.error(e);
            alert("作成に失敗したよ");
            createBtn.disabled = false;
            createBtn.innerText = "作成";
        }
    };
}