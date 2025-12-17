// VoiceHub - Simple Voice Chat Application
// Configured for public server deployment with TURN servers
class VoiceHub {
    constructor() {
        this.peer = null;
        this.localStream = null;
        this.screenStream = null;
        this.connections = new Map();
        this.participants = new Map();
        this.roomCode = null;
        this.username = '';
        this.isHost = false;
        this.isMuted = false;
        this.isScreenSharing = false;
        this.myPeerId = null;
        this.volumeSettings = new Map();
        this.audioElements = new Map();
        this.screenShareCalls = new Map();
        this.roomPassword = null;
        this.pendingJoinCode = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;

        // ICE Servers configuration for cross-network communication
        // Using free public TURN servers
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'stun:stun.stunprotocol.org:3478' },
                // OpenRelay TURN servers (free, public)
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10
        };

        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        this.loadUsername();
        this.checkUrlParams();
        this.generateCrosshairs();
        await this.initI18n();
    }

    async initI18n() {
        // Load saved language
        await window.i18n.loadLanguage(window.i18n.currentLang);
        window.i18n.updateUI();
        window.i18n.updateLangSelector();

        // Bind language selector events
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                window.i18n.setLanguage(btn.dataset.lang);
            });
        });
    }

    generateCrosshairs() {
        const container = document.getElementById('crosshair-pattern');
        if (!container) return;

        const count = 150;

        for (let i = 0; i < count; i++) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'crosshair');
            svg.setAttribute('viewBox', '0 0 40 40');

            // Random size between 15-50px
            const size = 15 + Math.random() * 35;
            svg.style.width = size + 'px';

            // Random position
            svg.style.left = Math.random() * 100 + '%';
            svg.style.top = Math.random() * 100 + '%';

            // Random fade animation (appear/disappear effect)
            const duration = 2 + Math.random() * 4;
            const delay = Math.random() * 6;
            svg.style.animation = `crosshairFade ${duration}s ease-in-out infinite`;
            svg.style.animationDelay = `-${delay}s`;

            // Crosshair SVG content
            svg.innerHTML = `
                <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <line x1="20" y1="4" x2="20" y2="12" stroke="currentColor" stroke-width="1.5"/>
                <line x1="20" y1="28" x2="20" y2="36" stroke="currentColor" stroke-width="1.5"/>
                <line x1="4" y1="20" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/>
                <line x1="28" y1="20" x2="36" y2="20" stroke="currentColor" stroke-width="1.5"/>
            `;

            container.appendChild(svg);
        }
    }

    bindElements() {
        // Screens
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.roomScreen = document.getElementById('room-screen');

        // Lobby elements
        this.usernameInput = document.getElementById('username');
        this.createRoomBtn = document.getElementById('create-room-btn');
        this.joinRoomBtn = document.getElementById('join-room-btn');
        this.joinRoomSection = document.getElementById('join-room-section');
        this.roomCodeInput = document.getElementById('room-code');
        this.joinBtn = document.getElementById('join-btn');

        // Room elements
        this.roomNameEl = document.getElementById('room-name');
        this.displayRoomCode = document.getElementById('display-room-code');
        this.copyCodeBtn = document.getElementById('copy-code-btn');
        this.leaveRoomBtn = document.getElementById('leave-room-btn');
        this.participantsList = document.getElementById('participants-list');
        this.muteBtn = document.getElementById('mute-btn');
        this.micOnIcon = document.getElementById('mic-on-icon');
        this.micOffIcon = document.getElementById('mic-off-icon');

        // Connection status
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');

        // Modal elements
        this.volumeModal = document.getElementById('volume-modal');
        this.volumeUserName = document.getElementById('volume-user-name');
        this.closeVolumeModal = document.getElementById('close-volume-modal');
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeValue = document.getElementById('volume-value');

        // Toast
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');

        // Screen Share elements
        this.screenShareBtn = document.getElementById('screen-share-btn');
        this.screenShareOffIcon = document.getElementById('screen-share-off-icon');
        this.screenShareOnIcon = document.getElementById('screen-share-on-icon');
        this.screenShareContainer = document.getElementById('screen-share-container');
        this.screenShareVideo = document.getElementById('screen-share-video');
        this.screenShareUser = document.getElementById('screen-share-user');
        this.closeScreenShare = document.getElementById('close-screen-share');

        // Password & Link Share elements
        this.shareLinkBtn = document.getElementById('share-link-btn');
        this.passwordBtn = document.getElementById('password-btn');
        this.lockOpenIcon = document.getElementById('lock-open-icon');
        this.lockClosedIcon = document.getElementById('lock-closed-icon');

        // Password Set Modal
        this.passwordModal = document.getElementById('password-modal');
        this.closePasswordModal = document.getElementById('close-password-modal');
        this.roomPasswordInput = document.getElementById('room-password');
        this.setPasswordBtn = document.getElementById('set-password-btn');

        // Password Enter Modal
        this.enterPasswordModal = document.getElementById('enter-password-modal');
        this.closeEnterPasswordModal = document.getElementById('close-enter-password-modal');
        this.enterRoomPasswordInput = document.getElementById('enter-room-password');
        this.submitPasswordBtn = document.getElementById('submit-password-btn');

        // Username Prompt Modal
        this.usernameModal = document.getElementById('username-modal');
        this.promptUsernameInput = document.getElementById('prompt-username');
        this.promptUsernameBtn = document.getElementById('prompt-username-btn');

        // Chat elements
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.fileBtn = document.getElementById('file-btn');
        this.fileInput = document.getElementById('file-input');
        this.chatBadge = document.getElementById('chat-badge');

        // File transfer tracking
        this.pendingFiles = new Map();
    }

    bindEvents() {
        // Lobby events
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.toggleJoinSection());
        this.joinBtn.addEventListener('click', () => this.joinRoom());
        this.usernameInput.addEventListener('input', () => this.saveUsername());
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Room events
        this.copyCodeBtn.addEventListener('click', () => this.copyRoomCode());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        this.closeScreenShare.addEventListener('click', () => this.stopScreenShare());
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        // Modal events
        this.closeVolumeModal.addEventListener('click', () => this.hideVolumeModal());
        this.volumeModal.addEventListener('click', (e) => {
            if (e.target === this.volumeModal) this.hideVolumeModal();
        });
        this.volumeSlider.addEventListener('input', (e) => this.updateVolume(e.target.value));

        // Password & Link Share events
        this.shareLinkBtn.addEventListener('click', () => this.shareRoomLink());
        this.passwordBtn.addEventListener('click', () => this.showPasswordModal());
        this.closePasswordModal.addEventListener('click', () => this.hidePasswordModal());
        this.passwordModal.addEventListener('click', (e) => {
            if (e.target === this.passwordModal) this.hidePasswordModal();
        });
        this.setPasswordBtn.addEventListener('click', () => this.setRoomPassword());

        // Enter password modal events
        this.closeEnterPasswordModal.addEventListener('click', () => this.hideEnterPasswordModal());
        this.enterPasswordModal.addEventListener('click', (e) => {
            if (e.target === this.enterPasswordModal) this.hideEnterPasswordModal();
        });
        this.submitPasswordBtn.addEventListener('click', () => this.submitPassword());
        this.enterRoomPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitPassword();
        });

        // Username modal events
        this.promptUsernameBtn.addEventListener('click', () => this.submitUsernamePrompt());
        this.promptUsernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitUsernamePrompt();
        });

        // Chat events
        this.sendBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        this.fileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop for file upload
        const chatPanel = document.querySelector('.chat-panel');
        if (chatPanel) {
            chatPanel.addEventListener('dragover', (e) => {
                e.preventDefault();
                chatPanel.classList.add('drag-over');
            });
            chatPanel.addEventListener('dragleave', (e) => {
                e.preventDefault();
                chatPanel.classList.remove('drag-over');
            });
            chatPanel.addEventListener('drop', (e) => {
                e.preventDefault();
                chatPanel.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    for (const file of files) {
                        this.sendFile(file);
                    }
                }
            });
        }

        // Handle page unload
        window.addEventListener('beforeunload', () => this.leaveRoom());
    }

    loadUsername() {
        const saved = localStorage.getItem('voicehub_username');
        if (saved) {
            this.usernameInput.value = saved;
        }
    }

    saveUsername() {
        localStorage.setItem('voicehub_username', this.usernameInput.value);
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        const urlPassword = urlParams.get('pwd');

        if (roomCode && roomCode.length === 6) {
            this.pendingJoinCode = roomCode.toUpperCase();

            // Store password from URL if present
            if (urlPassword) {
                this.urlPassword = decodeURIComponent(urlPassword);
            }

            // Check if username already exists
            const savedUsername = localStorage.getItem('voicehub_username');
            if (savedUsername && savedUsername.trim()) {
                // Auto join with saved username
                this.usernameInput.value = savedUsername;
                this.roomCodeInput.value = this.pendingJoinCode;
                this.showToast('Odaya otomatik katılınıyor...');
                setTimeout(() => this.joinRoom(), 500);
            } else {
                // Show username prompt before joining
                this.showUsernamePrompt();
            }

            // Clear URL params after reading
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    showUsernamePrompt() {
        // Show custom modal for username input
        this.promptUsernameInput.value = '';
        this.usernameModal.classList.remove('hidden');
        this.promptUsernameInput.focus();
    }

    hideUsernameModal() {
        this.usernameModal.classList.add('hidden');
    }

    submitUsernamePrompt() {
        const username = this.promptUsernameInput.value.trim();
        if (!username) {
            this.showToast('Kullanıcı adı gerekli');
            return;
        }

        this.usernameInput.value = username;
        this.saveUsername();
        this.roomCodeInput.value = this.pendingJoinCode;
        this.hideUsernameModal();
        this.showToast('Odaya katılınıyor...');
        setTimeout(() => this.joinRoom(), 300);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    updateConnectionStatus(status) {
        if (!this.statusDot || !this.statusText) return;

        this.statusDot.className = 'status-dot ' + status;
        switch (status) {
            case 'connected':
                this.statusText.textContent = 'Bağlandı';
                break;
            case 'connecting':
                this.statusText.textContent = 'Bağlanıyor...';
                break;
            case 'disconnected':
                this.statusText.textContent = 'Bağlantı Kesildi';
                break;
        }
    }

    async initPeer(roomCode, isHost) {
        return new Promise((resolve, reject) => {
            const peerId = isHost
                ? `voicehub-${roomCode}-host`
                : `voicehub-${roomCode}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

            this.updateConnectionStatus('connecting');

            this.peer = new Peer(peerId, {
                debug: 1,
                config: this.iceServers
            });

            this.peer.on('open', (id) => {
                console.log('Peer bağlantısı açıldı:', id);
                this.myPeerId = id;
                this.updateConnectionStatus('connected');
                this.reconnectAttempts = 0;
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('Peer hatası:', err);
                this.updateConnectionStatus('disconnected');

                if (err.type === 'unavailable-id') {
                    this.showToast('Bu oda zaten mevcut');
                } else if (err.type === 'peer-unavailable') {
                    this.showToast('Oda bulunamadı veya host çevrimdışı');
                } else if (err.type === 'network') {
                    this.showToast('Ağ hatası - internet bağlantınızı kontrol edin');
                } else if (err.type === 'server-error') {
                    this.showToast('Sunucu hatası - lütfen tekrar deneyin');
                } else {
                    this.showToast('Bağlantı hatası: ' + err.type);
                }
                reject(err);
            });

            this.peer.on('disconnected', () => {
                console.log('Peer bağlantısı koptu, yeniden bağlanılıyor...');
                this.updateConnectionStatus('connecting');

                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => {
                        if (this.peer && !this.peer.destroyed) {
                            this.peer.reconnect();
                        }
                    }, 2000);
                } else {
                    this.updateConnectionStatus('disconnected');
                    this.showToast('Bağlantı kurulamadı');
                }
            });

            this.peer.on('connection', (conn) => this.handleConnection(conn));
            this.peer.on('call', (call) => this.handleCall(call));
        });
    }

    async getMediaStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    latency: 0,
                    channelCount: 1,
                    sampleRate: 48000,
                    sampleSize: 16
                },
                video: false
            });
            return this.localStream;
        } catch (err) {
            console.error('Mikrofon erişim hatası:', err);
            if (err.name === 'NotAllowedError') {
                this.showToast('Mikrofon izni reddedildi! Lütfen izin verin.');
            } else if (err.name === 'NotFoundError') {
                this.showToast('Mikrofon bulunamadı!');
            } else {
                this.showToast('Mikrofon erişimi gerekli!');
            }
            throw err;
        }
    }

    async createRoom() {
        this.username = this.usernameInput.value.trim() || 'Anonim';
        this.roomCode = this.generateRoomCode();
        this.isHost = true;

        try {
            await this.getMediaStream();
            await this.initPeer(this.roomCode, true);

            this.participants.set(this.myPeerId, {
                id: this.myPeerId,
                name: this.username,
                isHost: true,
                isMuted: false
            });

            this.showRoomScreen();
            this.renderParticipants();
            this.showToast('Oda oluşturuldu!');
        } catch (err) {
            console.error('Oda oluşturma hatası:', err);
        }
    }

    async joinRoom() {
        const code = this.roomCodeInput.value.trim().toUpperCase();
        if (!code || code.length !== 6) {
            this.showToast('Geçerli bir oda kodu girin');
            return;
        }

        this.username = this.usernameInput.value.trim() || 'Anonim';
        this.roomCode = code;
        this.isHost = false;

        try {
            await this.getMediaStream();
            await this.initPeer(this.roomCode, false);

            const hostId = `voicehub-${this.roomCode}-host`;

            this.showToast('Host\'a bağlanılıyor...');

            const conn = this.peer.connect(hostId, {
                metadata: {
                    username: this.username,
                    type: 'join',
                    password: this.enteredPassword || null
                },
                reliable: true
            });

            // Store pending connection for retry with password
            this.pendingConnection = { conn, hostId };

            conn.on('open', () => {
                console.log('Host\'a bağlandı, şifre doğrulaması bekleniyor...');
                // Don't show room yet - wait for join-accepted or password-required
            });

            conn.on('error', (err) => {
                console.error('Bağlantı hatası:', err);
                this.showToast('Bağlantı hatası oluştu');
            });

            conn.on('data', (data) => {
                if (data.type === 'password-required') {
                    // Password is wrong or missing - show modal
                    this.showToast('Şifre gerekli');
                    this.pendingJoinCode = code;
                    this.showEnterPasswordModal(code);
                    // Clean up this connection
                    conn.close();
                    if (this.peer) {
                        this.peer.destroy();
                        this.peer = null;
                    }
                    return;
                }

                if (data.type === 'join-accepted') {
                    // Password verified, now actually join
                    console.log('Katılım onaylandı!');
                    this.completeJoin(conn, hostId);
                    return;
                }

                // Handle other data types
                this.handleData(conn, data);
            });

            conn.on('close', () => {
                if (this.pendingConnection) {
                    // Connection closed before we entered room - don't call handleDisconnect
                    this.pendingConnection = null;
                } else {
                    this.handleDisconnect(hostId);
                }
            });

        } catch (err) {
            console.error('Odaya katılma hatası:', err);
        }
    }

    completeJoin(conn, hostId) {
        this.pendingConnection = null;
        this.updateConnectionStatus('connected');

        const call = this.peer.call(hostId, this.localStream, {
            metadata: { username: this.username }
        });

        call.on('stream', (remoteStream) => {
            this.playStream(hostId, remoteStream);
        });

        call.on('error', (err) => {
            console.error('Çağrı hatası:', err);
        });

        this.connections.set(hostId, { conn, call, stream: null });

        this.participants.set(this.myPeerId, {
            id: this.myPeerId,
            name: this.username,
            isHost: false,
            isMuted: false
        });

        this.showRoomScreen();
        this.renderParticipants();
        this.showToast('Odaya katıldın!');
    }

    handleConnection(conn) {
        console.log('Yeni bağlantı:', conn.peer);
        const username = conn.metadata?.username || 'Anonim';
        const providedPassword = conn.metadata?.password;

        conn.on('open', () => {
            // Check password if room has one
            if (this.roomPassword && providedPassword !== this.roomPassword) {
                console.log('Şifre yanlış, bağlantı reddedildi');
                conn.send({
                    type: 'password-required',
                    message: 'Yanlış şifre'
                });
                setTimeout(() => conn.close(), 500);
                return;
            }

            // Password verified, send join-accepted first
            conn.send({
                type: 'join-accepted'
            });

            this.participants.set(conn.peer, {
                id: conn.peer,
                name: username,
                isHost: false,
                isMuted: false
            });

            // Notify existing participants about new user
            this.broadcast({
                type: 'new-peer',
                peerId: conn.peer,
                username: username
            });

            this.broadcastParticipants();
            this.renderParticipants();
            this.showToast(username + ' odaya katıldı');
        });

        conn.on('data', (data) => this.handleData(conn, data));
        conn.on('close', () => this.handleDisconnect(conn.peer));
        conn.on('error', (err) => {
            console.error('Bağlantı hatası:', err);
        });

        this.connections.set(conn.peer, { conn, call: null, stream: null });
    }

    handleCall(call) {
        console.log('=== GELEN ÇAĞRI ===');
        console.log('Peer:', call.peer);
        console.log('Metadata:', JSON.stringify(call.metadata));
        console.log('Type:', call.metadata?.type);

        // Check if this is a screen share call
        const isScreenShare = call.metadata?.type === 'screen-share';
        console.log('Is Screen Share:', isScreenShare);

        if (isScreenShare) {
            console.log('Screen share çağrısı algılandı, handleScreenShareCall çağrılıyor');
            this.handleScreenShareCall(call);
            return;
        }

        // Regular audio call
        console.log('Normal ses çağrısı, yanıtlanıyor');
        call.answer(this.localStream);

        call.on('stream', (remoteStream) => {
            console.log('Stream alındı, video tracks:', remoteStream.getVideoTracks().length);

            // Double check: if this stream has video tracks, it might be screen share
            if (remoteStream.getVideoTracks().length > 0) {
                console.log('Video track algılandı - bu screen share olabilir');
                const username = call.metadata?.username || this.participants.get(call.peer)?.name || 'Bilinmeyen';
                this.screenShareUser.textContent = username + ' ekranını paylaşıyor';
                this.screenShareContainer.classList.remove('hidden');
                this.screenShareVideo.srcObject = remoteStream;
                this.screenShareVideo.play().catch(e => console.log('Video play error:', e));
                return;
            }

            this.playStream(call.peer, remoteStream);
        });

        call.on('error', (err) => {
            console.error('Çağrı hatası:', err);
        });

        const existing = this.connections.get(call.peer) || {};
        this.connections.set(call.peer, { ...existing, call, stream: null });
    }

    handleData(conn, data) {
        console.log('Veri alındı:', data);

        switch (data.type) {
            case 'participants':
                this.participants.clear();
                data.participants.forEach(p => {
                    this.participants.set(p.id, p);
                });
                this.renderParticipants();
                break;

            case 'password-required':
                this.showToast('Yanlış şifre!');
                setTimeout(() => this.leaveRoom(), 1500);
                break;

            case 'mute-status':
                const participant = this.participants.get(data.peerId);
                if (participant) {
                    participant.isMuted = data.isMuted;
                    this.renderParticipants();
                }
                break;

            case 'kick':
                if (data.targetId === this.myPeerId) {
                    this.showToast('Odadan atıldınız!');
                    setTimeout(() => this.leaveRoom(), 1500);
                }
                break;

            case 'user-left':
                this.participants.delete(data.peerId);
                this.renderParticipants();
                break;

            case 'new-peer':
                if (!this.isHost && data.peerId !== this.myPeerId) {
                    this.connectToPeer(data.peerId, data.username);
                }
                break;

            case 'room-closed':
                this.showToast('Oda kapatıldı');
                setTimeout(() => this.leaveRoom(), 1500);
                break;

            case 'screen-share-start':
                // Someone started screen sharing
                this.showRemoteScreenShare(data.peerId, data.username);
                break;

            case 'screen-share-stop':
                // Someone stopped screen sharing
                this.hideScreenShare();
                break;

            case 'chat-message':
                // Received text message
                this.displayChatMessage({
                    sender: data.sender,
                    message: data.message,
                    time: data.time,
                    isOwn: false
                });
                break;

            case 'file-start':
                // File transfer starting
                this.pendingFiles.set(data.fileId, {
                    fileName: data.fileName,
                    fileSize: data.fileSize,
                    fileType: data.fileType,
                    totalChunks: data.totalChunks,
                    chunks: [],
                    receivedCount: 0,
                    sender: data.sender
                });
                this.displayFileMessage({
                    sender: data.sender,
                    fileName: data.fileName,
                    fileSize: data.fileSize,
                    fileId: data.fileId,
                    isOwn: false,
                    progress: 0
                });
                break;

            case 'file-chunk':
                // Receiving file chunk
                const pendingFile = this.pendingFiles.get(data.fileId);
                if (pendingFile) {
                    if (!pendingFile.chunks[data.chunkIndex]) {
                        pendingFile.receivedCount++;
                    }
                    pendingFile.chunks[data.chunkIndex] = new Uint8Array(data.data);

                    const progress = Math.round((pendingFile.receivedCount / data.totalChunks) * 100);

                    if (progress !== (pendingFile.lastProgress || 0)) {
                        this.updateFileProgress(data.fileId, progress);
                        pendingFile.lastProgress = progress;
                    }
                }
                break;

            case 'file-complete':
                // File transfer complete
                const completedFile = this.pendingFiles.get(data.fileId);
                if (completedFile) {
                    // Reconstruct file safely handling potential sparse arrays
                    const totalLength = completedFile.chunks.reduce((acc, chunk) => acc + (chunk ? chunk.length : 0), 0);
                    const result = new Uint8Array(totalLength);
                    let offset = 0;
                    for (let i = 0; i < completedFile.chunks.length; i++) {
                        const chunk = completedFile.chunks[i];
                        if (chunk) {
                            result.set(chunk, offset);
                            offset += chunk.length;
                        }
                    }

                    // Create download blob
                    const blob = new Blob([result], { type: completedFile.fileType || 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const fileName = completedFile.fileName;

                    // Update file message with download link
                    const fileEl = document.getElementById(`file-${data.fileId}`);
                    if (fileEl) {
                        const fileDiv = fileEl.querySelector('.message-file');
                        const statusSpan = fileEl.querySelector('.file-download-status');
                        if (fileDiv) {
                            fileDiv.style.cursor = 'pointer';
                            fileDiv.onclick = () => {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            };
                        }
                        if (statusSpan) {
                            statusSpan.textContent = '📥 İndir';
                            statusSpan.className = 'file-download-btn';
                        }
                    }

                    this.updateFileProgress(data.fileId, 100);
                    this.pendingFiles.delete(data.fileId);
                }
                break;
        }
    }

    async connectToPeer(peerId, username) {
        if (this.connections.has(peerId)) return;

        try {
            const conn = this.peer.connect(peerId, {
                metadata: { username: this.username },
                reliable: true
            });

            conn.on('open', () => {
                const call = this.peer.call(peerId, this.localStream, {
                    metadata: { username: this.username }
                });

                call.on('stream', (remoteStream) => {
                    this.playStream(peerId, remoteStream);
                });

                this.connections.set(peerId, { conn, call, stream: null });
            });

            conn.on('data', (data) => this.handleData(conn, data));
            conn.on('close', () => this.handleDisconnect(peerId));
        } catch (err) {
            console.error('Peer bağlantı hatası:', err);
        }
    }

    handleDisconnect(peerId) {
        console.log('Bağlantı koptu:', peerId);

        const participant = this.participants.get(peerId);
        if (participant) {
            this.showToast(participant.name + ' ayrıldı');
        }

        this.participants.delete(peerId);
        this.connections.delete(peerId);

        const audio = this.audioElements.get(peerId);
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            this.audioElements.delete(peerId);
        }

        this.renderParticipants();

        if (peerId.includes('-host') && !this.isHost) {
            this.showToast('Host ayrıldı, oda kapanıyor...');
            setTimeout(() => this.leaveRoom(), 2000);
        }
    }

    playStream(peerId, stream) {
        console.log('Stream oynatılıyor:', peerId);

        let audio = this.audioElements.get(peerId);
        if (!audio) {
            audio = document.createElement('audio');
            audio.autoplay = true;
            audio.playsInline = true;
            document.body.appendChild(audio);
            this.audioElements.set(peerId, audio);
        }

        audio.srcObject = stream;

        // iOS için gerekli
        audio.play().catch(err => {
            console.log('Otomatik oynatma engellendi:', err);
        });

        const volume = this.volumeSettings.get(peerId) ?? 100;
        audio.volume = volume / 100;
    }

    broadcastParticipants() {
        const participantsList = Array.from(this.participants.values());

        this.connections.forEach(({ conn }) => {
            if (conn && conn.open) {
                try {
                    conn.send({
                        type: 'participants',
                        participants: participantsList
                    });
                } catch (err) {
                    console.error('Broadcast hatası:', err);
                }
            }
        });
    }

    broadcast(data) {
        this.connections.forEach(({ conn }) => {
            if (conn && conn.open) {
                try {
                    conn.send(data);
                } catch (err) {
                    console.error('Broadcast hatası:', err);
                }
            }
        });
    }

    renderParticipants() {
        this.participantsList.innerHTML = '';

        this.participants.forEach((participant) => {
            const card = document.createElement('div');
            card.className = 'participant-card' + (participant.isMuted ? ' muted' : '');

            const initial = participant.name.charAt(0).toUpperCase();
            const isMe = participant.id === this.myPeerId;

            let badge = '';
            if (participant.isHost) {
                badge = `<div class="avatar-badge host">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                </div>`;
            } else if (participant.isMuted) {
                badge = `<div class="avatar-badge muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="1" y1="1" x2="23" y2="23"/>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                    </svg>
                </div>`;
            }

            let actions = '';
            if (!isMe) {
                actions = `
                    <button class="action-btn volume" data-peer-id="${participant.id}" data-name="${participant.name}" title="Ses Seviyesi">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                    </button>
                `;

                if (this.isHost) {
                    actions += `
                        <button class="action-btn kick" data-peer-id="${participant.id}" data-name="${participant.name}" title="Odadan At">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <line x1="18" y1="8" x2="23" y2="13"/>
                                <line x1="23" y1="8" x2="18" y2="13"/>
                            </svg>
                        </button>
                    `;
                }
            }

            card.innerHTML = `
                <div class="avatar">
                    ${initial}
                    ${badge}
                </div>
                <div class="participant-name">${participant.name}</div>
                <div class="participant-tag">${isMe ? '(Sen)' : ''} ${participant.isHost ? '👑 Host' : ''}</div>
                <div class="participant-actions">
                    ${actions}
                </div>
            `;

            this.participantsList.appendChild(card);
        });

        // Event listener'ları ekle
        this.participantsList.querySelectorAll('.action-btn.volume').forEach(btn => {
            btn.addEventListener('click', () => {
                const peerId = btn.dataset.peerId;
                const name = btn.dataset.name;
                this.showVolumeModal(peerId, name);
            });
        });

        this.participantsList.querySelectorAll('.action-btn.kick').forEach(btn => {
            btn.addEventListener('click', () => {
                const peerId = btn.dataset.peerId;
                const name = btn.dataset.name;
                this.kickUser(peerId, name);
            });
        });
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        this.muteBtn.classList.toggle('muted', this.isMuted);
        this.micOnIcon.classList.toggle('hidden', this.isMuted);
        this.micOffIcon.classList.toggle('hidden', !this.isMuted);

        const me = this.participants.get(this.myPeerId);
        if (me) {
            me.isMuted = this.isMuted;
            this.renderParticipants();
        }

        this.broadcast({
            type: 'mute-status',
            peerId: this.myPeerId,
            isMuted: this.isMuted
        });

        this.showToast(this.isMuted ? 'Mikrofon kapatıldı' : 'Mikrofon açıldı');
    }

    // ==================== SCREEN SHARE ====================
    async toggleScreenShare() {
        if (this.isScreenSharing) {
            this.stopScreenShare();
        } else {
            await this.startScreenShare();
        }
    }

    async startScreenShare() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: false
            });

            this.isScreenSharing = true;
            this.screenShareBtn.classList.add('active');
            this.screenShareOffIcon.classList.add('hidden');
            this.screenShareOnIcon.classList.remove('hidden');

            // Show local preview
            this.screenShareVideo.srcObject = this.screenStream;
            this.screenShareUser.textContent = this.username + ' (Sen)';
            this.screenShareContainer.classList.remove('hidden');

            // Handle stream end (user clicks "Stop Sharing" in browser)
            this.screenStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };

            // Send screen to all connected peers
            console.log('Ekran paylaşımı başlatılıyor, bağlantılar:', this.connections.size);

            this.connections.forEach(({ conn }, peerId) => {
                console.log('Peer kontrolü:', peerId, 'conn.open:', conn?.open);
                if (conn && conn.open) {
                    try {
                        console.log('Ekran paylaşımı çağrısı yapılıyor:', peerId);
                        const call = this.peer.call(peerId, this.screenStream, {
                            metadata: {
                                username: this.username,
                                type: 'screen-share'
                            }
                        });

                        if (call) {
                            console.log('Ekran paylaşımı çağrısı oluşturuldu:', peerId);

                            call.on('stream', (stream) => {
                                console.log('Screen share call stream alındı (gönderen taraf)');
                            });

                            call.on('error', (err) => {
                                console.error('Screen share call hatası:', peerId, err);
                            });

                            call.on('close', () => {
                                console.log('Screen share call kapandı:', peerId);
                            });

                            this.screenShareCalls.set(peerId, call);
                        } else {
                            console.error('Call oluşturulamadı:', peerId);
                        }
                    } catch (err) {
                        console.error('Ekran paylaşımı çağrısı hatası:', peerId, err);
                    }
                }
            });

            // Notify others
            this.broadcast({
                type: 'screen-share-start',
                peerId: this.myPeerId,
                username: this.username
            });

            this.showToast('Ekran paylaşımı başladı');

        } catch (err) {
            console.error('Ekran paylaşımı hatası:', err);
            if (err.name === 'NotAllowedError') {
                this.showToast('Ekran paylaşımı iptal edildi');
            } else {
                this.showToast('Ekran paylaşımı başlatılamadı');
            }
        }
    }

    stopScreenShare() {
        if (!this.isScreenSharing) return;

        // Stop screen stream
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Close screen share calls
        this.screenShareCalls.forEach(call => {
            try {
                call.close();
            } catch (err) {
                console.error('Screen share call kapatma hatası:', err);
            }
        });
        this.screenShareCalls.clear();

        this.isScreenSharing = false;
        this.screenShareBtn.classList.remove('active');
        this.screenShareOffIcon.classList.remove('hidden');
        this.screenShareOnIcon.classList.add('hidden');

        // Hide container
        this.hideScreenShare();

        // Notify others
        this.broadcast({
            type: 'screen-share-stop',
            peerId: this.myPeerId
        });

        this.showToast('Ekran paylaşımı durduruldu');
    }

    showRemoteScreenShare(peerId, username) {
        this.screenShareUser.textContent = username + ' ekranını paylaşıyor';
        this.screenShareContainer.classList.remove('hidden');
        this.showToast(username + ' ekran paylaşmaya başladı');
    }

    hideScreenShare() {
        this.screenShareContainer.classList.add('hidden');
        this.screenShareVideo.srcObject = null;
    }

    handleScreenShareCall(call) {
        console.log('Ekran paylaşımı çağrısı alındı:', call.peer, call.metadata);

        const username = call.metadata?.username || 'Bilinmeyen';

        call.answer();

        call.on('stream', (remoteStream) => {
            console.log('Screen share stream alındı');
            // Show the container and set video
            this.screenShareUser.textContent = username + ' ekranını paylaşıyor';
            this.screenShareContainer.classList.remove('hidden');
            this.screenShareVideo.srcObject = remoteStream;

            // Play the video
            this.screenShareVideo.play().catch(err => {
                console.log('Video otomatik oynatma hatası:', err);
            });
        });

        call.on('close', () => {
            console.log('Screen share call kapandı');
            this.hideScreenShare();
        });

        call.on('error', (err) => {
            console.error('Screen share çağrı hatası:', err);
        });
    }

    kickUser(peerId, name) {
        if (!this.isHost) return;

        const connection = this.connections.get(peerId);
        if (connection?.conn?.open) {
            try {
                connection.conn.send({
                    type: 'kick',
                    targetId: peerId
                });
            } catch (err) {
                console.error('Kick mesajı gönderilemedi:', err);
            }
        }

        setTimeout(() => {
            if (connection?.call) connection.call.close();
            if (connection?.conn) connection.conn.close();

            this.participants.delete(peerId);
            this.connections.delete(peerId);

            this.broadcast({
                type: 'user-left',
                peerId: peerId
            });

            this.broadcastParticipants();
            this.renderParticipants();
            this.showToast(name + ' odadan atıldı');
        }, 500);
    }

    showVolumeModal(peerId, name) {
        this.currentVolumePeerId = peerId;
        this.volumeUserName.textContent = name;

        const volume = this.volumeSettings.get(peerId) ?? 100;
        this.volumeSlider.value = volume;
        this.volumeValue.textContent = volume + '%';

        this.volumeModal.classList.remove('hidden');
    }

    hideVolumeModal() {
        this.volumeModal.classList.add('hidden');
        this.currentVolumePeerId = null;
    }

    updateVolume(value) {
        const volume = parseInt(value);
        this.volumeValue.textContent = volume + '%';

        if (this.currentVolumePeerId) {
            this.volumeSettings.set(this.currentVolumePeerId, volume);

            const audio = this.audioElements.get(this.currentVolumePeerId);
            if (audio) {
                audio.volume = volume / 100;
            }
        }
    }

    toggleJoinSection() {
        this.joinRoomSection.classList.toggle('hidden');
        if (!this.joinRoomSection.classList.contains('hidden')) {
            this.roomCodeInput.focus();
        }
    }

    showRoomScreen() {
        this.lobbyScreen.classList.remove('active');
        this.roomScreen.classList.add('active');
        this.roomNameEl.textContent = this.isHost ? 'Senin Odan' : 'Sesli Oda';
        this.displayRoomCode.textContent = this.roomCode;
    }

    showLobbyScreen() {
        this.roomScreen.classList.remove('active');
        this.lobbyScreen.classList.add('active');
    }

    async copyRoomCode() {
        try {
            await navigator.clipboard.writeText(this.roomCode);
            this.showToast('Kod kopyalandı: ' + this.roomCode);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.roomCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Kod kopyalandı: ' + this.roomCode);
        }
    }

    leaveRoom() {
        // Notify others before leaving
        if (this.isHost) {
            this.broadcast({ type: 'room-closed' });
        } else {
            this.broadcast({
                type: 'user-left',
                peerId: this.myPeerId
            });
        }

        // Close all connections
        this.connections.forEach(({ conn, call }) => {
            try {
                if (call) call.close();
                if (conn) conn.close();
            } catch (err) {
                console.error('Bağlantı kapatma hatası:', err);
            }
        });

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Clean up audio elements
        this.audioElements.forEach(audio => {
            audio.pause();
            audio.srcObject = null;
            audio.remove();
        });
        this.audioElements.clear();

        // Destroy peer
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        // Reset state
        this.connections.clear();
        this.participants.clear();
        this.volumeSettings.clear();
        this.roomCode = null;
        this.isHost = false;
        this.isMuted = false;
        this.myPeerId = null;
        this.reconnectAttempts = 0;

        // Reset UI
        this.muteBtn.classList.remove('muted');
        this.micOnIcon.classList.remove('hidden');
        this.micOffIcon.classList.add('hidden');
        this.roomCodeInput.value = '';
        this.joinRoomSection.classList.add('hidden');

        this.showLobbyScreen();
    }

    // ==================== PASSWORD & LINK SHARE ====================
    shareRoomLink() {
        const baseUrl = window.location.origin + window.location.pathname;
        let shareUrl = baseUrl + '?room=' + this.roomCode;

        // Include password in URL if set
        if (this.roomPassword) {
            shareUrl += '&pwd=' + encodeURIComponent(this.roomPassword);
        }

        // Always copy to clipboard directly
        navigator.clipboard.writeText(shareUrl).then(() => {
            this.showToast('Link kopyalandı!');
        }).catch(() => {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Link kopyalandı!');
        });
    }

    showPasswordModal() {
        if (!this.isHost) {
            this.showToast('Sadece oda sahibi şifre ayarlayabilir');
            return;
        }
        this.roomPasswordInput.value = this.roomPassword || '';
        this.passwordModal.classList.remove('hidden');
        this.roomPasswordInput.focus();
    }

    hidePasswordModal() {
        this.passwordModal.classList.add('hidden');
    }

    setRoomPassword() {
        const password = this.roomPasswordInput.value.trim();
        this.roomPassword = password || null;

        this.updatePasswordUI();
        this.hidePasswordModal();

        // Broadcast password change to participants
        this.broadcast({
            type: 'password-update',
            hasPassword: !!this.roomPassword
        });

        if (this.roomPassword) {
            this.showToast('Şifre ayarlandı');
        } else {
            this.showToast('Şifre kaldırıldı');
        }
    }

    updatePasswordUI() {
        if (this.roomPassword) {
            this.lockOpenIcon.classList.add('hidden');
            this.lockClosedIcon.classList.remove('hidden');
            this.passwordBtn.classList.add('active');
        } else {
            this.lockOpenIcon.classList.remove('hidden');
            this.lockClosedIcon.classList.add('hidden');
            this.passwordBtn.classList.remove('active');
        }
    }

    showEnterPasswordModal(roomCode) {
        this.pendingJoinCode = roomCode;
        this.enterRoomPasswordInput.value = '';
        this.enterPasswordModal.classList.remove('hidden');
        this.enterRoomPasswordInput.focus();
    }

    hideEnterPasswordModal() {
        this.enterPasswordModal.classList.add('hidden');
        this.pendingJoinCode = null;
    }

    submitPassword() {
        const password = this.enterRoomPasswordInput.value.trim();
        if (!password) {
            this.showToast('Lütfen şifre girin');
            return;
        }

        // Continue join with password
        this.hideEnterPasswordModal();
        this.joinRoomWithPassword(this.pendingJoinCode, password);
    }

    async joinRoomWithPassword(code, password) {
        // This will be handled in the join flow
        this.enteredPassword = password;
        this.roomCodeInput.value = code;
        await this.joinRoom();
    }

    // ==================== CHAT & FILE SHARING ====================
    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Display own message
        this.displayChatMessage({
            sender: this.usernameInput.value,
            message: message,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            isOwn: true
        });

        // Send to all peers
        this.connections.forEach((peerData) => {
            if (peerData.conn && peerData.conn.open) {
                peerData.conn.send({
                    type: 'chat-message',
                    sender: this.usernameInput.value,
                    message: message,
                    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                });
            }
        });

        this.chatInput.value = '';
    }

    displayChatMessage(data) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${data.isOwn ? 'own' : 'other'}`;

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${data.sender}</span>
                <span class="message-time">${data.time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(data.message)}</div>
        `;

        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (!files.length) return;

        for (const file of files) {
            this.sendFile(file);
        }

        this.fileInput.value = '';
    }

    sendFile(file) {
        const reader = new FileReader();
        const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Show sending message
        this.displayFileMessage({
            sender: this.usernameInput.value,
            fileName: file.name,
            fileSize: file.size,
            fileId: fileId,
            isOwn: true,
            progress: 0
        });

        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const chunkSize = 16384; // 16KB chunks
            const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);

            // Send file metadata first
            this.connections.forEach((peerData) => {
                if (peerData.conn && peerData.conn.open) {
                    peerData.conn.send({
                        type: 'file-start',
                        fileId: fileId,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        totalChunks: totalChunks,
                        sender: this.usernameInput.value
                    });
                }
            });

            // Send chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
                const chunk = arrayBuffer.slice(start, end);

                this.connections.forEach((peerData) => {
                    if (peerData.conn && peerData.conn.open) {
                        peerData.conn.send({
                            type: 'file-chunk',
                            fileId: fileId,
                            chunkIndex: i,
                            totalChunks: totalChunks,
                            data: chunk // Send ArrayBuffer directly
                        });
                    }
                });

                // Update progress
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                this.updateFileProgress(fileId, progress);
            }

            // Send completion
            this.connections.forEach((peerData) => {
                if (peerData.conn && peerData.conn.open) {
                    peerData.conn.send({
                        type: 'file-complete',
                        fileId: fileId
                    });
                }
            });

            // Update sender's own file status
            const fileEl = document.getElementById(`file-${fileId}`);
            if (fileEl) {
                const statusSpan = fileEl.querySelector('.file-download-status');
                if (statusSpan) {
                    statusSpan.textContent = '✅ Gönderildi';
                    statusSpan.className = 'file-download-btn';
                }
            }
            this.updateFileProgress(fileId, 100);
        };

        reader.readAsArrayBuffer(file);
    }

    displayFileMessage(data) {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${data.isOwn ? 'own' : 'other'}`;
        messageEl.id = `file-${data.fileId}`;

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${data.sender}</span>
            </div>
            <div class="message-file" data-file-id="${data.fileId}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <div class="message-file-info">
                    <div class="message-file-name">${data.fileName}</div>
                    <div class="message-file-size">${this.formatFileSize(data.fileSize)}</div>
                </div>
                <span class="file-download-status">${data.isOwn ? 'Gönderiliyor...' : 'İndiriliyor...'}</span>
            </div>
            <div class="file-progress" id="progress-${data.fileId}">
                <div class="file-progress-bar" style="width: ${data.progress}%"></div>
            </div>
        `;

        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateFileProgress(fileId, progress) {
        const progressEl = document.getElementById(`progress-${fileId}`);
        if (progressEl) {
            const bar = progressEl.querySelector('.file-progress-bar');
            if (bar) bar.style.width = `${progress}%`;
            if (progress >= 100) {
                setTimeout(() => progressEl.remove(), 1000);
            }
        }
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    showToast(message) {
        this.toastMessage.textContent = message;
        this.toast.classList.remove('hidden');

        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 3500);
    }
}

// Start application
document.addEventListener('DOMContentLoaded', () => {
    window.voiceHub = new VoiceHub();
});
