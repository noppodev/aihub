import { app, checkAuth } from '../auth.js';
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const db = getFirestore(app);
const APP_ID = 'noppo-drive-ultimate';

async function init() {
    const user = await checkAuth();
    if (!user) return;

    // type: directory であれば、AIHub上のプロジェクトとして全て表示する
    const q = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'items'),
        where('type', '==', 'directory')
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById('project-grid');
        grid.innerHTML = '';
        snap.forEach(doc => {
            const proj = doc.data();
            const card = document.createElement('div');
            card.className = 'bg-white border rounded-[2rem] p-6 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all group';
            card.onclick = () => location.href = `editor.html?id=${doc.id}`;
            card.innerHTML = `
                <div class="w-12 h-12 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all"><i data-lucide="folder"></i></div>
                <h3 class="text-lg font-black">${proj.name}</h3>
                <p class="text-slate-400 text-[10px] font-bold mt-1 uppercase">AIHub Project</p>
            `;
            grid.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
    });
}
init();