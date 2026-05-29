// ===================== ОФЛАЙН-ХЕЛПЕР =====================
// Использует Firebase SDK через window._db, window._get, window._ref
// Загружается ПОСЛЕ type="module" (но до вызова функций)

window.downloadOfflinePackage = async function() {
    var _this = window.currentStudent;
    if (!_this) {
        if (typeof showNotification === 'function') showNotification('Сначала войдите в систему.', 'error', 3000);
        return;
    }

    var db = window._db;
    var get = window._get;
    var ref = window._ref;

    if (!db || !get || !ref) {
        if (typeof showNotification === 'function') showNotification('Firebase SDK не загружен. Перезагрузите страницу.', 'error', 5000);
        return;
    }

    try {
        var studentSnap = await get(ref(db, 'teachers/' + _this.teacherId + '/students/' + _this.uid));
        var studentData = studentSnap.val();
        if (!studentData) throw new Error('Нет данных ученика');

        var topicsSnap = await get(ref(db, 'teachers/' + _this.teacherId + '/topics'));
        var allTopicsObj = topicsSnap.val() || {};

        var allTopics = Object.values(allTopicsObj);
        var assigned = allTopics.filter(function(t) { return t.assignedTo && t.assignedTo.indexOf(_this.uid) !== -1; });

        var sessionId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        var offlineData = {
            student: { uid: _this.uid, name: _this.name, teacherId: _this.teacherId },
            topicProgress: studentData.topicProgress || {},
            topics: assigned,
            sessionId: sessionId,
            exportedAt: Date.now()
        };

        var templateResponse = await fetch('offline_template.html');
        if (!templateResponse.ok) throw new Error('Не удалось загрузить шаблон офлайн-пакета');
        var template = await templateResponse.text();

        var dataJson = JSON.stringify(offlineData);
        // Вставляем JSON напрямую вместо {} после window.__offlineData =
        var searchStr = 'window.__offlineData = ';
        var idx = template.indexOf(searchStr);
        if (idx !== -1) {
            var before = template.slice(0, idx + searchStr.length);
            var after = template.slice(idx + searchStr.length);
            var semiIdx = after.indexOf(';');
            if (semiIdx !== -1) {
                template = before + dataJson + after.slice(semiIdx);
            } else {
                template = before + dataJson + after;
            }
        }


        var blob = new Blob([template], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var dateStr = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
        var filename = 'ФореСтади_офлайн_' + dateStr + '.html';

        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof showNotification === 'function') showNotification('✅ Офлайн-пакет скачан!', 'success', 4000);
    } catch (e) {
        console.error('Ошибка при скачивании офлайн-пакета:', e);
        if (typeof showNotification === 'function') showNotification('❌ Ошибка: ' + e.message, 'error', 5000);
    }
};

window.uploadOfflineResults = function() {
    var _this = window.currentStudent;
    if (!_this) {
        if (typeof showNotification === 'function') showNotification('Сначала войдите в систему.', 'error', 3000);
        return;
    }
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.forestudy,.json';
    input.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) return;
        try {
            var text = await file.text();
            var data = JSON.parse(text);
            if (typeof window.processOfflineResults === 'function') {
                await window.processOfflineResults(data);
            } else {
                if (typeof showNotification === 'function') showNotification('⚠️ Функция загрузки результатов не найдена. Используйте онлайн-версию.', 'warning', 5000);
            }
        } catch (err) {
            if (typeof showNotification === 'function') showNotification('Ошибка чтения файла: ' + err.message, 'error', 5000);
        }
    };
    input.click();
};