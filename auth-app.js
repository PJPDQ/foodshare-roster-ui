import { auth } from './auth.js';
import { dataService } from './data-service.js';

export const authApp = {
    async init() {
        await auth.init();
        this.updateUI();
        
        // Check URL for auth callback
        const hash = window.location.hash;
        if (hash.includes('access_token')) {
            window.location.hash = '';
        }
    },
    
    updateUI() {
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        
        if (auth.isAuthenticated()) {
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            
            // Load roster data
            this.loadAppData();
        } else {
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            this.showLogin();
        }
    },
    
    showLogin() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    },
    
    showSignup() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    },
    
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await auth.signIn(email, password);
            this.updateUI();
        } catch (err) {
            alert('Login failed: ' + err.message);
        }
    },
    
    async signup() {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const username = document.getElementById('signupUsername').value;
        const fullName = document.getElementById('signupName').value;
        
        try {
            await auth.signUp(email, password, username, fullName);
            alert('Check your email for confirmation link!');
            this.showLogin();
        } catch (err) {
            alert('Signup failed: ' + err.message);
        }
    },
    
    async logout() {
        await auth.signOut();
        dataService.cleanup();
        this.updateUI();
    },
    
    async loadAppData() {
        // Load from Supabase instead of localStorage
        await dataService.loadRoster('rock-church-brisbane'); // Your church ID
        app.initFromCloud();
    }
};