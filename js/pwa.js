if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrato'))
            .catch(err => console.log('Errore Service Worker', err));
    });
}

let deferredPrompt;
const installBtn = document.getElementById('install-btn');

if (installBtn) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Utente ha installato la webapp');
                }
                deferredPrompt = null;
                installBtn.style.display = 'none';
            });
        }
    });
}
