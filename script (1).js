class ConfessionSite {
    constructor() {
        this.confessions =
            JSON.parse(localStorage.getItem("confessions")) || [];
        this.favorites = JSON.parse(localStorage.getItem("favorites")) || [];
        this.currentFilter = "all";
        this.currentSort = "newest";
        this.searchTerm = "";
        this.currentConfessionId = null;
        this.isDarkMode = localStorage.getItem("darkMode") === "true";
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.displayConfessions();
        this.startFloatingEmojis();
        this.updateStats();
        this.setTheme();
        this.playBackgroundMusic();
    }

    setupElements() {
        this.confessionText = document.getElementById("confessionText");
        this.submitBtn = document.getElementById("submitBtn");
        this.charCount = document.getElementById("charCount");
        this.confessionsList = document.getElementById("confessionsList");
        this.categorySelect = document.getElementById("categorySelect");
        this.searchInput = document.getElementById("searchInput");
        this.categoryFilter = document.getElementById("categoryFilter");
        this.sortSelect = document.getElementById("sortSelect");
        this.emojiPicker = document.getElementById("emojiPicker");
        this.themeToggle = document.getElementById("themeToggle");
        this.commentModal = document.getElementById("commentModal");
    }

    setupEventListeners() {
        // Mevcut event listener'lar
        this.confessionText.addEventListener("input", () => {
            this.updateCharCounter();
            this.autoSave();
        });

        this.submitBtn.addEventListener("click", () => {
            this.submitConfession();
        });

        this.confessionText.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && e.ctrlKey) {
                this.submitConfession();
            }
        });

        // Yeni event listener'lar
        this.searchInput.addEventListener("input", () => {
            this.searchTerm = this.searchInput.value.toLowerCase();
            this.displayConfessions();
        });

        this.categoryFilter.addEventListener("change", () => {
            this.currentFilter = this.categoryFilter.value;
            this.displayConfessions();
        });

        this.sortSelect.addEventListener("change", () => {
            this.currentSort = this.sortSelect.value;
            this.displayConfessions();
        });

        // Emoji picker
        document.querySelectorAll(".emoji-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const emoji = btn.textContent;
                const cursorPos = this.confessionText.selectionStart;
                const textBefore = this.confessionText.value.substring(
                    0,
                    cursorPos,
                );
                const textAfter =
                    this.confessionText.value.substring(cursorPos);
                this.confessionText.value = textBefore + emoji + textAfter;
                this.confessionText.selectionStart = cursorPos + emoji.length;
                this.confessionText.selectionEnd = cursorPos + emoji.length;
                this.confessionText.focus();
                this.updateCharCounter();
            });
        });

        // Tema değiştirici
        this.themeToggle.addEventListener("click", () => {
            this.toggleTheme();
        });

        // Aksiyon butonları
        document.getElementById("randomBtn").addEventListener("click", () => {
            this.showRandomConfession();
        });

        document.getElementById("dailyBtn").addEventListener("click", () => {
            this.showDailyConfession();
        });

        document
            .getElementById("favoritesBtn")
            .addEventListener("click", () => {
                this.showFavorites();
            });

        // Modal kapatma
        document.querySelector(".close").addEventListener("click", () => {
            this.commentModal.style.display = "none";
        });

        window.addEventListener("click", (e) => {
            if (e.target === this.commentModal) {
                this.commentModal.style.display = "none";
            }
        });

        // Otomatik kaydetme geri yükleme
        this.loadAutoSave();
    }

    updateCharCounter() {
        const length = this.confessionText.value.length;
        this.charCount.textContent = length;

        if (length > 450) {
            this.charCount.style.color = "#ff4444";
        } else if (length > 350) {
            this.charCount.style.color = "#ff8800";
        } else {
            this.charCount.style.color = "var(--text-secondary)";
        }
    }

    submitConfession() {
        const text = this.confessionText.value.trim();
        const category = this.categorySelect.value;

        if (!text) {
            this.showError("Lütfen bir itiraf yazın!");
            return;
        }

        if (text.length < 10) {
            this.showError("İtirafınız en az 10 karakter olmalı!");
            return;
        }

        const confession = {
            id: Date.now(),
            text: text,
            category: category,
            timestamp: new Date().toLocaleString("tr-TR"),
            date: new Date().toDateString(),
            likes: 0,
            dislikes: 0,
            love: 0,
            laugh: 0,
            sad: 0,
            angry: 0,
            comments: [],
            rating: 0,
            ratings: [],
        };

        this.confessions.unshift(confession);
        this.saveConfessions();
        this.displayConfessions();
        this.clearForm();
        this.showSuccess();
        this.triggerConfetti();
        this.updateStats();
        this.clearAutoSave();
        this.playSound("success");
        this.showNotification("İtiraf başarıyla gönderildi! ✨", "success");
    }

    displayConfessions() {
        let filteredConfessions = [...this.confessions];

        // Arama filtresi
        if (this.searchTerm) {
            filteredConfessions = filteredConfessions.filter(
                (confession) =>
                    confession.text.toLowerCase().includes(this.searchTerm) ||
                    confession.category.toLowerCase().includes(this.searchTerm),
            );
        }

        // Kategori filtresi
        if (this.currentFilter !== "all") {
            filteredConfessions = filteredConfessions.filter(
                (confession) => confession.category === this.currentFilter,
            );
        }

        // Sıralama
        switch (this.currentSort) {
            case "oldest":
                filteredConfessions.reverse();
                break;
            case "mostLiked":
                filteredConfessions.sort(
                    (a, b) => b.likes + b.love - (a.likes + a.love),
                );
                break;
            case "random":
                filteredConfessions = this.shuffleArray(filteredConfessions);
                break;
        }

        this.confessionsList.innerHTML = "";

        if (filteredConfessions.length === 0) {
            this.confessionsList.innerHTML = `
                <div class="confession-item" style="text-align: center; opacity: 0.7;">
                    <p class="confession-text">
                        ${
                            this.searchTerm
                                ? "Arama kriterlerinize uygun itiraf bulunamadı. 🔍"
                                : this.currentFilter !== "all"
                                  ? "Bu kategoride henüz itiraf yok. 📝"
                                  : "Henüz hiç itiraf yok. İlk itirafı sen yap! 🌟"
                        }
                    </p>
                </div>
            `;
            return;
        }

        filteredConfessions.forEach((confession, index) => {
            const confessionElement = this.createConfessionElement(
                confession,
                index,
            );
            this.confessionsList.appendChild(confessionElement);
        });
    }

    createConfessionElement(confession, index) {
        const div = document.createElement("div");
        div.className = "confession-item";
        div.style.animationDelay = `${index * 0.1}s`;

        const categoryEmoji = this.getCategoryEmoji(confession.category);
        const isFavorite = this.favorites.includes(confession.id);

        div.innerHTML = `
            <div class="confession-header">
                <span class="confession-category">${categoryEmoji} ${this.getCategoryName(confession.category)}</span>
                <div class="confession-actions">
                    <button class="favorite-btn ${isFavorite ? "active" : ""}" onclick="confessionSite.toggleFavorite(${confession.id})">
                        ${isFavorite ? "💖" : "🤍"}
                    </button>
                    <button class="share-btn" onclick="confessionSite.shareConfession(${confession.id})">📤</button>
                </div>
            </div>
            <p class="confession-text">"${confession.text}"</p>
            <div class="confession-reactions">
                <button class="reaction-btn" onclick="window.confessionSite.addReaction(${confession.id}, 'like')">
                    ❤️ ${confession.likes || 0}
                </button>
                <button class="reaction-btn" onclick="window.confessionSite.addReaction(${confession.id}, 'love')">
                    😍 ${confession.love || 0}
                </button>
                <button class="reaction-btn" onclick="window.confessionSite.addReaction(${confession.id}, 'laugh')">
                    😂 ${confession.laugh || 0}
                </button>
                <button class="reaction-btn" onclick="window.confessionSite.addReaction(${confession.id}, 'sad')">
                    😢 ${confession.sad || 0}
                </button>
                <button class="reaction-btn" onclick="window.confessionSite.addReaction(${confession.id}, 'angry')">
                    😡 ${confession.angry || 0}
                </button>
            </div>
            <div class="confession-footer">
                <div class="confession-time">
                    ${confession.timestamp}
                </div>
                <div class="confession-meta">
                    <button class="comment-btn" onclick="window.confessionSite.openComments(${confession.id})">
                        💬 ${confession.comments ? confession.comments.length : 0}
                    </button>
                    <div class="star-rating">
                        ${this.createStarRating(confession.id, confession.rating || 0)}
                    </div>
                </div>
            </div>
        `;

        return div;
    }

    getCategoryEmoji(category) {
        const emojis = {
            genel: "🌟",
            ask: "💕",
            is: "💼",
            aile: "👨‍👩‍👧‍👦",
            arkadas: "👫",
            korku: "😱",
            mutluluk: "😊",
            pisman: "😔",
        };
        return emojis[category] || "🌟";
    }

    getCategoryName(category) {
        const names = {
            genel: "Genel",
            ask: "Aşk",
            is: "İş/Okul",
            aile: "Aile",
            arkadas: "Arkadaşlık",
            korku: "Korku/Endişe",
            mutluluk: "Mutluluk",
            pisman: "Pişmanlık",
        };
        return names[category] || "Genel";
    }

    addReaction(id, type) {
        const confession = this.confessions.find((c) => c.id === id);
        if (confession) {
            confession[type] = (confession[type] || 0) + 1;
            this.saveConfessions();
            this.displayConfessions();
            this.updateStats();
            this.playSound("reaction");
        }
    }

    toggleFavorite(id) {
        const index = this.favorites.indexOf(id);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showNotification("Favorilerden çıkarıldı", "info");
        } else {
            this.favorites.push(id);
            this.showNotification("Favorilere eklendi! ❤️", "success");
        }
        localStorage.setItem("favorites", JSON.stringify(this.favorites));
        this.displayConfessions();
    }

    shareConfession(id) {
        const confession = this.confessions.find((c) => c.id === id);
        if (confession && navigator.share) {
            navigator.share({
                title: "İtiraf Sitesi",
                text: confession.text,
                url: window.location.href,
            });
        } else {
            // Fallback - metni panoya kopyala
            navigator.clipboard.writeText(
                `"${confession.text}" - İtiraf Sitesi`,
            );
            this.showNotification("İtiraf panoya kopyalandı! 📋", "success");
        }
    }

    openComments(id) {
        this.currentConfessionId = id;
        const confession = this.confessions.find((c) => c.id === id);
        if (confession) {
            this.displayComments(confession.comments || []);
            this.commentModal.style.display = "block";
        }
    }

    displayComments(comments) {
        const commentsList = document.getElementById("commentsList");
        commentsList.innerHTML = "";

        if (comments.length === 0) {
            commentsList.innerHTML =
                '<p style="text-align: center; opacity: 0.7;">Henüz yorum yok. İlk yorumu sen yap!</p>';
            return;
        }

        comments.forEach((comment) => {
            const div = document.createElement("div");
            div.className = "comment-item";
            div.innerHTML = `
                <p>${comment.text}</p>
                <small>${comment.timestamp}</small>
            `;
            commentsList.appendChild(div);
        });
    }

    showRandomConfession() {
        if (this.confessions.length === 0) {
            this.showNotification("Henüz hiç itiraf yok!", "info");
            return;
        }

        const randomIndex = Math.floor(Math.random() * this.confessions.length);
        const randomConfession = this.confessions[randomIndex];

        this.confessionsList.innerHTML = "";
        const element = this.createConfessionElement(randomConfession, 0);
        element.style.border = "3px solid gold";
        element.style.transform = "scale(1.02)";
        this.confessionsList.appendChild(element);

        this.showNotification("Rastgele itiraf gösteriliyor! 🎲", "info");
    }

    showDailyConfession() {
        const today = new Date().toDateString();
        const todayConfessions = this.confessions.filter(
            (c) => c.date === today,
        );

        if (todayConfessions.length === 0) {
            this.showNotification("Bugün henüz itiraf yok!", "info");
            return;
        }

        const mostLiked = todayConfessions.reduce((prev, current) =>
            (prev.likes || 0) + (prev.love || 0) >
            (current.likes || 0) + (current.love || 0)
                ? prev
                : current,
        );

        this.confessionsList.innerHTML = "";
        const element = this.createConfessionElement(mostLiked, 0);
        element.style.border = "3px solid #FFD700";
        element.style.background = "linear-gradient(135deg, #FFF8DC, #FFFACD)";
        this.confessionsList.appendChild(element);

        this.showNotification("Günün en beğenilen itirafı! ⭐", "success");
    }

    showFavorites() {
        const favoriteConfessions = this.confessions.filter((c) =>
            this.favorites.includes(c.id),
        );

        this.confessionsList.innerHTML = "";

        if (favoriteConfessions.length === 0) {
            this.confessionsList.innerHTML = `
                <div class="confession-item" style="text-align: center; opacity: 0.7;">
                    <p class="confession-text">Henüz favori itirafınız yok! ❤️</p>
                </div>
            `;
            return;
        }

        favoriteConfessions.forEach((confession, index) => {
            const element = this.createConfessionElement(confession, index);
            element.style.border = "2px solid #ff69b4";
            this.confessionsList.appendChild(element);
        });

        this.showNotification(
            `${favoriteConfessions.length} favori itiraf gösteriliyor! ❤️`,
            "info",
        );
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem("darkMode", this.isDarkMode);
        this.setTheme();
    }

    setTheme() {
        if (this.isDarkMode) {
            document.body.classList.add("dark-mode");
            document.getElementById("themeIcon").textContent = "☀️";
        } else {
            document.body.classList.remove("dark-mode");
            document.getElementById("themeIcon").textContent = "🌙";
        }
    }

    updateStats() {
        const totalConfessions = this.confessions.length;
        const totalLikes = this.confessions.reduce(
            (sum, c) => sum + (c.likes || 0) + (c.love || 0),
            0,
        );
        const today = new Date().toDateString();
        const todayConfessions = this.confessions.filter(
            (c) => c.date === today,
        ).length;

        document.getElementById("totalConfessions").textContent =
            totalConfessions;
        document.getElementById("totalLikes").textContent = totalLikes;
        document.getElementById("todayConfessions").textContent =
            todayConfessions;
    }

    autoSave() {
        localStorage.setItem("autoSave", this.confessionText.value);
    }

    loadAutoSave() {
        const saved = localStorage.getItem("autoSave");
        if (saved && saved.trim()) {
            this.confessionText.value = saved;
            this.updateCharCounter();
        }
    }

    clearAutoSave() {
        localStorage.removeItem("autoSave");
    }

    showNotification(message, type = "info") {
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document
            .getElementById("notificationContainer")
            .appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = "0";
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    playSound(type) {
        try {
            // Web Audio API ile basit ses efektleri
            const audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const frequencies = {
                success: [523, 659, 784],
                reaction: [440],
                error: [220, 196],
            };

            const freq = frequencies[type] || [440];

            oscillator.frequency.setValueAtTime(
                freq[0],
                audioContext.currentTime,
            );
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Ses çalmazsa sessiz geç
        }
    }

    playBackgroundMusic() {
        // Arka plan müziği için boş metod (isteğe bağlı)
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Mevcut metodlar (değiştirilmemiş)
    showError(message) {
        this.submitBtn.style.background =
            "linear-gradient(45deg, #ff4444, #cc0000)";
        const originalText =
            this.submitBtn.querySelector(".btn-text").textContent;
        this.submitBtn.querySelector(".btn-text").textContent = message;

        setTimeout(() => {
            this.submitBtn.style.background = "var(--primary-gradient)";
            this.submitBtn.querySelector(".btn-text").textContent =
                originalText;
        }, 2000);
    }

    showSuccess() {
        this.submitBtn.classList.add("success-animation");
        const originalText =
            this.submitBtn.querySelector(".btn-text").textContent;
        this.submitBtn.querySelector(".btn-text").textContent =
            "İtiraf Gönderildi! ✨";

        setTimeout(() => {
            this.submitBtn.classList.remove("success-animation");
            this.submitBtn.querySelector(".btn-text").textContent =
                originalText;
        }, 2000);
    }

    clearForm() {
        this.confessionText.value = "";
        this.categorySelect.value = "genel";
        this.updateCharCounter();
    }

    saveConfessions() {
        localStorage.setItem("confessions", JSON.stringify(this.confessions));
    }

    startFloatingEmojis() {
        const emojis = document.querySelectorAll(".emoji");
        emojis.forEach((emoji) => {
            this.animateEmoji(emoji);
        });
    }

    animateEmoji(emoji) {
        const startPosition = Math.random() * window.innerWidth;
        emoji.style.left = startPosition + "px";
        emoji.style.animationDuration = 5 + Math.random() * 5 + "s";

        setTimeout(
            () => {
                this.animateEmoji(emoji);
            },
            5000 + Math.random() * 5000,
        );
    }

    triggerConfetti() {
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                this.createConfettiPiece();
            }, i * 50);
        }
    }

    createConfettiPiece() {
        const confetti = document.createElement("div");
        const colors = [
            "#ff6b6b",
            "#4ecdc4",
            "#45b7d1",
            "#f9ca24",
            "#f0932b",
            "#eb4d4b",
            "#6c5ce7",
            "#fd79a8",
            "#00b894",
        ];

        confetti.style.position = "fixed";
        confetti.style.width = "12px";
        confetti.style.height = "12px";
        confetti.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * window.innerWidth + "px";
        confetti.style.top = "-15px";
        confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
        confetti.style.pointerEvents = "none";
        confetti.style.zIndex = "1000";
        confetti.style.animation = "confettiFall 4s linear forwards";

        document.body.appendChild(confetti);

        setTimeout(() => {
            confetti.remove();
        }, 4000);
    }

    createStarRating(confessionId, currentRating) {
        let stars = "";
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= currentRating ? "filled" : ""}" onclick="window.confessionSite.rateConfession(${confessionId}, ${i})">⭐</span>`;
        }
        return stars;
    }

    rateConfession(id, rating) {
        const confession = this.confessions.find((c) => c.id === id);
        if (confession) {
            confession.rating = rating;
            this.saveConfessions();
            this.displayConfessions();
            this.showNotification(`${rating} yıldız verdiniz! ⭐`, "success");
        }
    }
}

// CSS dinamik ekleme
const style = document.createElement("style");
style.textContent = `
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(1080deg);
            opacity: 0;
        }
    }
    
    .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
    }
    
    .notification {
        background: rgba(255,255,255,0.95);
        color: #333;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s ease;
        border-left: 4px solid #4CAF50;
    }
    
    .notification.error {
        border-left-color: #f44336;
    }
    
    .notification.info {
        border-left-color: #2196F3;
    }
`;
document.head.appendChild(style);

// Site başlatma
window.confessionSite = new ConfessionSite();

// Yorum ekleme
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("addCommentBtn")?.addEventListener("click", () => {
        const commentText = document.getElementById("commentText").value.trim();
        if (!commentText || !window.confessionSite.currentConfessionId) return;

        const confession = window.confessionSite.confessions.find(
            (c) => c.id === window.confessionSite.currentConfessionId,
        );
        if (confession) {
            if (!confession.comments) confession.comments = [];
            confession.comments.push({
                text: commentText,
                timestamp: new Date().toLocaleString("tr-TR"),
            });

            window.confessionSite.saveConfessions();
            window.confessionSite.displayComments(confession.comments);
            window.confessionSite.displayConfessions();
            document.getElementById("commentText").value = "";
            window.confessionSite.showNotification(
                "Yorum eklendi! 💬",
                "success",
            );
        }
    });
});
