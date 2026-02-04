const app = {
    data: {
        members: [],
        weeks: [],
        view: 'calendar',
        userName: '',
        notificationsEnabled: false,
        fixedSharingRotation: [],
        notificationSettings: {
            prepNotice: 1440,      // Minutes before (default: 1 day = 1440 min)
            shareNotice: 1440,     // Minutes before
            notifyPrep: true,      // Whether to notify for prep
            notifyShare: true      // Whether to notify for share
        },
        lastNotified: {          // Track what we already notified for
            prep: null,          // Week ID
            share: null          // Week ID
        },
        allowSharingEdit: false 
    },

    init() {
        this.loadData();
        this.setupNotifications();
        this.render();
        this.checkMyTurn();
        
        setInterval(() => this.checkMyTurn(), 60000);
        
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed'));
        }

        if (this.data.notificationsEnabled) {
            this.requestNotificationPermission();
        }
    },

    loadData() {
        const saved = null; //localStorage.getItem('foodRosterData');
        // console.log(`SAVED = ${saved}`);
        if (saved) {
            // console.log(`Loading saved data`);  
            this.data = JSON.parse(saved);
        } else {
            console.log(`ELSE saved data`);  
            this.data.members = ['Kiki', 'Valdo', 'Joy', 'Yowil', 'Stanley', 'Kezia', 'Hansel', 'Nathan C', 'Acha', 'Cornelius', 'Dicky', 'Andrew Wilaras', 'Andrew Wijaya'];
            this.generateWeeks(this.data.fixedSharingRotation.length); 
        }
        
        // console.log(`END LOAD saved data`);  
        if (this.data.notificationsEnabled === undefined) {
            this.data.notificationsEnabled = false;
        }
    },

    saveData() {
        localStorage.setItem('foodRosterData', JSON.stringify(this.data));
    },

    setupNotifications() {
        const toggle = document.getElementById('notificationMasterToggle');
        toggle.checked = this.data.notificationsEnabled;
        this.updateNotificationStatus();
    },

    async requestNotificationPermission() {
        if (!("Notification" in window)) {
            alert("This browser does not support notifications");
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            return true;
        } else {
            this.data.notificationsEnabled = false;
            document.getElementById('notificationToggle').checked = false;
            this.saveData();
            this.updateNotificationStatus();
            return false;
        }
    },

    async toggleNotifications() {
        const enabled = document.getElementById('notificationToggle').checked;
        
        if (enabled) {
            const granted = await this.requestNotificationPermission();
            if (!granted) {
                document.getElementById('notificationToggle').checked = false;
                return;
            }
        }

        this.data.notificationsEnabled = enabled;
        this.saveData();
        this.updateNotificationStatus();
        
        if (enabled) {
            this.checkMyTurn();
            this.showNotification("Notifications Enabled", "You'll be notified when it's your turn!");
        }
    },

    updateNotificationStatus() {
        const status = document.getElementById('notificationStatus');
        if (this.data.notificationsEnabled) {
            status.textContent = "Notifications are enabled";
            status.style.color = "var(--secondary)";
        } else {
            status.textContent = "Notifications are disabled";
            status.style.color = "var(--text-light)";
        }
    },

    showNotification(title, body) {
        if (this.data.notificationsEnabled && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%234f46e5' width='192' height='192' rx='40'/%3E%3Ctext x='96' y='120' font-size='80' text-anchor='middle' fill='white'%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E",
                badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%234f46e5' width='192' height='192' rx='40'/%3E%3Ctext x='96' y='120' font-size='80' text-anchor='middle' fill='white'%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E",
                tag: 'turn-notification',
                requireInteraction: true
            });
        }
    },

    checkMyTurn() {
        if (!this.data.userName) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find current fortnightly week (week 2 or 4)
        const currentWeek = this.getCurrentFortnightWeek(today);
        if (!currentWeek) return;

        const startDate = new Date(currentWeek.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        // Check if today is within this fortnightly week
        if (today >= startDate && today <= endDate) {
            let turnType = null;
            
            if (currentWeek.prep === this.data.userName) turnType = 'prep';
            else if (currentWeek.share === this.data.userName) turnType = 'share';
            
            if (turnType) this.showTurnNotification(turnType, currentWeek);
        }

        return currentWeek;
    },

    getCurrentFortnightWeek(today) {
        // Find the fortnightly week that contains today or is closest future
        return this.data.weeks.find(week => {
            const start = new Date(week.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return today >= start && today <= end;
        });
    },

    showTurnNotification(type, week) {
        const banner = document.getElementById('turnBanner');
        const message = document.getElementById('turnMessage');
        const headerBtn = document.getElementById('userProfileBtn');

        banner.className = 'notification-banner show my-turn-' + type;
        
        if (type === 'prep') {
            message.textContent = `Hey ${this.data.userName}! It's your FOOD PREP week (Fortnightly)!`;
            headerBtn.classList.add('has-turn');
        } else {
            message.textContent = `Hey ${this.data.userName}! It's your SHARING week (Fortnightly)!`;
            headerBtn.classList.add('has-turn');
        }

        // Send browser notification once per day
        const todayStr = new Date().toISOString().split('T')[0];
        const lastNotified = localStorage.getItem('lastNotifiedDate');
        
        if (lastNotified !== todayStr && this.data.notificationsEnabled) {
            this.showNotification("Your Fortnightly Turn!", message.textContent);
            localStorage.setItem('lastNotifiedDate', todayStr);
        }
    },

    openUserProfile() {
        this.renderUserNameSelect();
        document.getElementById('userProfileModal').classList.add('active');
        document.getElementById('notificationToggle').checked = this.data.notificationsEnabled;
        this.updateNotificationStatus();
    },

    closeUserProfile() {
        document.getElementById('userProfileModal').classList.remove('active');
    },

    renderUserNameSelect() {
        const select = document.getElementById('userNameSelect');
        const currentValue = this.data.userName || '';
        
        while (select.options.length > 1) {
            select.remove(1);
        }

        this.data.members.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            if (member === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    },

    handleUserNameChange() {
        const select = document.getElementById('userNameSelect');
        this.data.userName = select.value;
        this.saveData();
        this.updateUserDisplay();
        this.checkMyTurn();
        this.render();
    },

    updateUserDisplay() {
        const display = document.getElementById('userNameDisplay');
        if (this.data.userName) {
            display.textContent = `${this.data.userName}`;
        } else {
            display.textContent = `Set My Name`;
        }
    },

    // generateWeeks(count = 1) {
    //     // Start from beginning of current month
    //     let targetDate = new Date();
    //     targetDate.setDate(1);
    //     targetDate.setHours(0, 0, 0, 0);
        
    //     let added = 0;
    //     let monthsChecked = 0;
        
    //     while (added < count && monthsChecked < 24) {
    //         const year = targetDate.getFullYear();
    //         const month = targetDate.getMonth();
            
    //         // Calculate Week 2 (days 8-14) - find Monday of this week
    //         const week2 = new Date(year, month, 8);
    //         while (week2.getDay() !== 1) { // 1 = Monday
    //             week2.setDate(week2.getDate() + 1);
    //         }
            
    //         // Calculate Week 4 (days 22-28) - find Monday of this week  
    //         const week4 = new Date(year, month, 22);
    //         while (week4.getDay() !== 1) { // 1 = Monday
    //             week4.setDate(week4.getDate() + 1);
    //         }
            
    //         const today = new Date();
    //         today.setHours(0,0,0,0);
            
    //         // Add Week 2 if it's today or future and not exists
    //         if (week2 >= today && !this.weekExists(week2)) {
    //             if (this.data.weeks.length === 0 || new Date(this.data.weeks[this.data.weeks.length-1].startDate) < week2) {
    //                 this.createSingleWeek(week2); // Changed from addWeek to createSingleWeek
    //                 added++;
    //                 if (added >= count) break;
    //             }
    //         }
            
    //         // Add Week 4 if it's today or future and not exists
    //         if (week4 >= today && !this.weekExists(week4) && added < count) {
    //             if (this.data.weeks.length === 0 || new Date(this.data.weeks[this.data.weeks.length-1].startDate) < week4) {
    //                 this.createSingleWeek(week4); // Changed from addWeek to createSingleWeek
    //                 added++;
    //             }
    //         }
            
    //         // Move to next month
    //         targetDate.setMonth(targetDate.getMonth() + 1);
    //         monthsChecked++;
    //     }
        
    //     this.saveData();
    //     this.render();
    // },
    generateWeeks(count = 1) {
        let targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setHours(0, 0, 0, 0);
        
        let added = 0;
        let monthsChecked = 0;
        let rotationIndex = 0; // Continue from where we left off
        
        while (added < count && monthsChecked < 24) {
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth();
            
            // Week 1 (first Monday)
            const week1 = new Date(year, month, 1);
            while (week1.getDay() !== 2) week1.setDate(week1.getDate() + 1);
            
            // Week 3 (third Monday)
            const week3 = new Date(year, month, 15);
            while (week3.getDay() !== 2) week3.setDate(week3.getDate() + 1);
            
            const today = new Date();
            today.setHours(0,0,0,0);
            
            // Process Week 1
            if (week1 >= today && !this.weekExists(week1)) {
                if (this.data.weeks.length === 0 || this.getLastWeekDate() < week1) {
                    this.createWeekWithFixedSharing(week1, rotationIndex);
                    rotationIndex++;
                    added++;
                    if (added >= count) break;
                }
            }
            
            // Process Week 3
            if (week3 >= today && !this.weekExists(week3) && added < count) {
                if (this.data.weeks.length === 0 || this.getLastWeekDate() < week3) {
                    this.createWeekWithFixedSharing(week3, rotationIndex);
                    rotationIndex++;
                    added++;
                }
            }
            
            targetDate.setMonth(targetDate.getMonth() + 1);
            monthsChecked++;
        }
        
        this.saveData();
        this.render();
    },

    getLastWeekDate() {
        if (this.data.weeks.length === 0) return new Date(0);
        return new Date(this.data.weeks[this.data.weeks.length - 1].startDate);
    },

    createWeekWithFixedSharing(date, rotationIndex) {
        // Get fixed sharing person from rotation
        const sharingPerson = this.getFixedSharingPerson(rotationIndex);
        
        // Get prep person (lowest frequency, not the sharing person)
        const prepPerson = this.getNextPrepPerson(sharingPerson);
        
        this.data.weeks.push({
            id: Date.now() + Math.random(),
            startDate: date.toISOString(),
            prep: prepPerson,
            share: sharingPerson,
            fixedShare: true, // Flag to indicate sharing is fixed
            rotationIndex: rotationIndex // Track position in rotation
        });
        console.log(`Created week on ${date.toISOString().split('T')[0]} - Prep: ${prepPerson}, Share: ${sharingPerson}`);  
        // Sort by date
        this.data.weeks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    },

    getFixedSharingPerson(index) {
        if (this.data.fixedSharingRotation.length === 0) {
            // Fallback to balanced rotation if not set
            return this.data.members[index % this.data.members.length];
        }
        return this.data.fixedSharingRotation[index % this.data.fixedSharingRotation.length];
    },

    getNextPrepPerson(excludePerson) {
        // Get frequency counts up to current point
        const freq = this.getFrequencies();
        console.log(`Exclude Person = ${excludePerson}\nFrequencies for prep selection:`, freq);   
        // Sort by prep frequency (ascending), excluding the sharing person
        const candidates = this.data.members
            .filter(m => m !== excludePerson)
            .sort((a, b) => (freq[a]?.prep || 0) - (freq[b]?.prep || 0));
        console.log(`Prep candidates (sorted):`, candidates);
        console.log(`Result = ${candidates[0] || this.data.members.find(m => m !== excludePerson) || 'TBD'}`);  
        return candidates[0] || this.data.members.find(m => m !== excludePerson) || 'TBD';
    },

    setFixedSharingRotation(rotationArray) {
        // Admin function to set the fixed rotation pattern
        this.data.fixedSharingRotation = rotationArray;
        this.saveData();
        // alert('Fixed sharing rotation set. Regenerate weeks to apply.');
    },

    // // Renamed from addWeek to avoid conflict with button handler
    // createSingleWeek(date) {
    //     const assignment = this.assignRoles(date);
    //     this.data.weeks.push({
    //         id: Date.now() + Math.random(),
    //         startDate: date.toISOString(),
    //         prep: assignment.prep,
    //         share: assignment.share
    //     });
    //     // Sort weeks by date
    //     this.data.weeks.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    // },

    weekExists(date) {
        const checkDate = date.toISOString().split('T')[0];
        return this.data.weeks.some(w => {
            const wDate = new Date(w.startDate).toISOString().split('T')[0];
            return wDate === checkDate;
        });
    },

    // This is the button handler - keep it separate
    addWeek() {
        this.generateWeeks(1); // This calls generateWeeks, which uses createSingleWeek internally
    },

    createFortnightWeek(date) {
        const assignment = this.assignRoles(date);
        this.data.weeks.push({
            id: Date.now() + Math.random(),
            startDate: date.toISOString(),
            prep: assignment.prep,
            share: assignment.share,
            fortnight: true // Mark as fortnightly week
        });
    },

    isWeekScheduled(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.data.weeks.some(w => {
            const wDate = new Date(w.startDate);
            return wDate.toISOString().split('T')[0] === dateStr;
        });
    },

    assignRoles(weekDate) {
        if (this.data.members.length < 2) {
            return { prep: 'TBD', share: 'TBD' };
        }

        const frequencies = this.getFrequencies();
        const sortedByTotal = [...this.data.members].sort((a, b) => {
            const totalA = (frequencies[a]?.prep || 0) + (frequencies[a]?.share || 0);
            const totalB = (frequencies[b]?.prep || 0) + (frequencies[b]?.share || 0);
            return totalA - totalB;
        });

        const prepPerson = sortedByTotal[0];
        
        let sharePerson = sortedByTotal[1];
        if (sortedByTotal.length > 2) {
            const remaining = sortedByTotal.filter(m => m !== prepPerson);
            const shareFreqs = remaining.map(m => frequencies[m]?.share || 0);
            const minShare = Math.min(...shareFreqs);
            const candidates = remaining.filter(m => (frequencies[m]?.share || 0) === minShare);
            sharePerson = candidates[0];
        }

        return { prep: prepPerson, share: sharePerson };
    },

    getFrequencies() {
        const freq = {};
        this.data.members.forEach(m => {
            freq[m] = { prep: 0, share: 0 };
        });

        this.data.weeks.forEach(week => {
            if (freq[week.share]) freq[week.share].share++;
            if (freq[week.prep]) freq[week.prep].prep++;
        });

        return freq;
    },

    regenerateRoster() {
        if (!confirm('This will regenerate all future weeks. Continue?')) return;
        
        const today = new Date();
        const futureWeeks = this.data.weeks.filter(w => new Date(w.startDate) > today);
        const pastWeeks = this.data.weeks.filter(w => new Date(w.startDate) <= today);
        
        this.data.weeks = pastWeeks;
        this.generateWeeks(futureWeeks.length || 4);
    },

    addWeek() {
        this.generateWeeks(1);
    },

    removeWeek(id) {
        if (!confirm('Remove this week?')) return;
        this.data.weeks = this.data.weeks.filter(w => w.id !== id);
        this.saveData();
        this.render();
    },

    setView(view) {
        this.data.view = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', 
                (view === 'calendar' && btn.textContent === 'Calendar') ||
                (view === 'list' && btn.textContent === 'List')
            );
        });
        this.renderSchedule();
    },

    render() {
        this.updateUserDisplay();
        this.renderSchedule();
        this.renderStats();
        document.getElementById('weekCount').textContent = `(${this.data.weeks.length} weeks)`;
    },

    renderSchedule() {
        const container = document.getElementById('scheduleContainer');
        
        // Debug: Log what we have
        console.log("Total weeks:", this.data.weeks.length);
        console.log("Weeks data:", this.data.weeks);
        
        if (this.data.weeks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <h3>No Schedule Yet</h3>
                    <p>Add members and click "Add Week" to generate fortnightly schedule</p>
                </div>
            `;
            return;
        }
        
        // Show all weeks (remove the fortnightly filter for now)
        const weeksToShow = this.data.weeks; 

        if (this.data.view === 'calendar') {
            container.innerHTML = `<div class="weeks-container">${weeksToShow.map(week => this.renderWeekCard(week)).join('')}</div>`;
        } else {
            container.innerHTML = this.renderListView();
        }
    },

    getWeekOfMonth(date) {
        const d = new Date(date);
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const dayOfWeek = firstDay.getDay();
        const currentDay = d.getDate();
        return Math.ceil((currentDay + dayOfWeek) / 7);
    },

    renderWeekCard(week) {
        const date = new Date(week.startDate);
        date.setDate(date.getDate() + 1);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 6);
        
        const weekNum = this.getWeekOfMonth(date);
        const dateStr = `${date.toLocaleDateString()} - ${endDate.toLocaleDateString()} (Week ${weekNum} of month)`;
        const isPast = new Date() > endDate;
        const isCurrentWeek = new Date() >= date && new Date() <= endDate;
        
        const isMyPrep = this.data.userName && week.prep === this.data.userName && isCurrentWeek;
        const isMyShare = this.data.userName && week.share === this.data.userName && isCurrentWeek;

        let cardClass = 'week-card';
        if (isMyPrep) cardClass += ' my-turn-prep';
        if (isMyShare) cardClass += ' my-turn-share';

        return `
            <div class="week-card ${isMyPrep ? 'my-turn-prep' : ''} ${isMyShare ? 'my-turn-share' : ''}">
                ${(isMyPrep || isMyShare) ? `<div class="my-turn-badge">⭐ It's You!</div>` : ''}
                <div class="week-header">
                    <div>
                        <div class="week-title">Week of ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                        <div class="week-date">${dateStr}</div>
                        ${week.manuallyEdited ? '<span style="font-size: 0.7rem; color: var(--warning); margin-left: 0.5rem;">Edited</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${!isPast ? `
                            <button class="btn-icon" onclick="app.openWeekEdit(${week.id})" style="background: var(--primary); color: white;" title="Edit">✏️</button>
                            <button class="btn-icon" onclick="app.removeWeek(${week.id})" style="background: transparent; color: var(--danger);">🗑️</button>
                        ` : ''}
                    </div>
                </div>
                <div class="week-assignments">
                    <div class="assignment prep ${this.data.userName && week.prep === this.data.userName ? 'me' : ''}">
                        <div>
                            <div class="assignment-role">Food Prep</div>
                            <div class="assignment-person">${week.prep}</div>
                        </div>
                    </div>
                    <div class="assignment share ${this.data.userName && week.share === this.data.userName ? 'me' : ''}">
                        <div>
                            <div class="assignment-role">Sharing</div>
                            <div class="assignment-person">${week.share}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderListView(weeks = this.data.weeks) {
        return `
            <div class="list-view active">
                <table class="list-table">
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th>Food Prep</th>
                            <th>Sharing</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${weeks.map(week => {
                            const date = new Date(week.startDate);
                            const endDate = new Date(date);
                            endDate.setDate(endDate.getDate() + 6);
                            const isPast = new Date() > endDate;
                            const isCurrentWeek = new Date() >= date && new Date() <= endDate;
                            const isMyTurn = isCurrentWeek && (week.prep === this.data.userName || week.share === this.data.userName);
                            
                            return `
                                <tr class="list-row ${isMyTurn ? 'my-turn' : ''}" style="${isPast ? 'opacity: 0.6;' : ''}">
                                    <td>
                                        <div style="font-weight: 600;">${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-light);">${endDate.toLocaleDateString()}</div>
                                    </td>
                                    <td><span class="tag prep ${week.prep === this.data.userName && isCurrentWeek ? 'me' : ''}">${week.prep}</span></td>
                                    <td><span class="tag share ${week.share === this.data.userName && isCurrentWeek ? 'me' : ''}">${week.share}</span></td>
                                    <td>
                                        ${!isPast ? `<button class="btn" onclick="app.removeWeek(${week.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Remove</button>` : '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderStats() {
        const container = document.getElementById('statsContainer');
        const freq = this.getFrequencies();
        
        if (this.data.members.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>Add members to see statistics</p></div>`;
            return;
        }

        const totalPrep = Object.values(freq).reduce((sum, f) => sum + f.prep, 0);
        const totalShare = Object.values(freq).reduce((sum, f) => sum + f.share, 0);

        let html = `
            <div class="stat-card">
                <div class="stat-header">📈 Totals</div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Total Prep Sessions:</span>
                    <strong>${totalPrep}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Sharing Sessions:</span>
                    <strong>${totalShare}</strong>
                </div>
            </div>
        `;

        html += `<div class="stat-card"><div class="stat-header">👥 Member Breakdown</div>`;
        
        Object.entries(freq).forEach(([member, counts]) => {
            const isMe = member === this.data.userName;
            html += `
                <div class="member-stat">
                    <span class="member-name ${isMe ? 'me' : ''}">${member} ${isMe ? '(You)' : ''}</span>
                    <div class="stat-badges">
                        <span class="badge prep">${counts.prep}</span>
                        <span class="badge share">${counts.share}</span>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
    },

    openSettings() {
        this.renderMembersList();
        document.getElementById('settingsModal').classList.add('active');
    },

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    },

    renderMembersList() {
        const container = document.getElementById('membersList');
        const count = document.getElementById('memberCount');
        
        count.textContent = this.data.members.length;
        
        if (this.data.members.length === 0) {
            container.innerHTML = '<span style="color: var(--text-light); font-style: italic;">No members added</span>';
            return;
        }

        container.innerHTML = this.data.members.map((member, index) => `
            <div class="member-tag">
                ${member}
                <button onclick="app.removeMember(${index})" title="Remove">×</button>
            </div>
        `).join('');
    },

    addMember() {
        const input = document.getElementById('newMemberName');
        const name = input.value.trim();
        
        if (!name) return;
        if (this.data.members.includes(name)) {
            alert('Member already exists!');
            return;
        }

        this.data.members.push(name);
        this.saveData();
        input.value = '';
        this.renderMembersList();
        this.render();
    },

    removeMember(index) {
        if (this.data.members.length <= 2) {
            alert('Need at least 2 members for rostering!');
            return;
        }
        const removedName = this.data.members[index];
        this.data.members.splice(index, 1);
        
        if (this.data.userName === removedName) {
            this.data.userName = '';
            this.updateUserDisplay();
        }
        
        this.saveData();
        this.renderMembersList();
        this.render();
    },

    clearData() {
        if (!confirm('Clear all data? This cannot be undone.')) return;
        localStorage.removeItem('foodRosterData');
        localStorage.removeItem('lastNotifiedDate');
        this.data = { members: [], weeks: [], view: 'calendar', userName: '', notificationsEnabled: false };
        this.render();
        this.closeSettings();
    },
    toggleView() {
        const rosterView = document.getElementById('rosterView');
        const churchView = document.getElementById('churchInfoView');
        const toggleBtn = document.getElementById('viewToggleBtn');
        const toggleIcon = document.getElementById('viewToggleIcon');
        const toggleText = document.getElementById('viewToggleText');
        const addWeekBtn = document.getElementById('addWeekBtn');
        
        if (rosterView.classList.contains('active')) {
            // Switch to Church Info
            rosterView.classList.remove('active');
            churchView.classList.add('active');
            toggleIcon.textContent = '📅';
            toggleText.textContent = 'Back to Roster';
            addWeekBtn.style.display = 'none'; // Hide add week button in info view
            window.scrollTo(0, 0);
        } else {
            // Switch back to Roster
            churchView.classList.remove('active');
            rosterView.classList.add('active');
            toggleIcon.textContent = '⛪';
            toggleText.textContent = 'Church Info';
            addWeekBtn.style.display = 'inline-flex';
            window.scrollTo(0, 0);
        }
    },


    /* Edit Functionality */
    openWeekEdit(weekId) {
        const week = this.data.weeks.find(w => w.id === weekId);
        if (!week) return;
        
        const prepSelect = document.getElementById('editPrep');
        const shareSelect = document.getElementById('editShare');
        
        // Populate dropdowns
        prepSelect.innerHTML = '<option value="">-- Select --</option>' + 
            this.data.members.map(m => `<option value="${m}" ${m === week.prep ? 'selected' : ''}>${m}</option>`).join('');
        
        shareSelect.innerHTML = '<option value="">-- Select --</option>' + 
            this.data.members.map(m => `<option value="${m}" ${m === week.share ? 'selected' : ''}>${m}</option>`).join('');
        
        // Disable sharing edit if it's fixed and not allowed
        if (week.fixedShare && !this.data.allowSharingEdit) {
            shareSelect.disabled = true;
            shareSelect.title = "Sharing is in fixed rotation";
        } else {
            shareSelect.disabled = false;
            shareSelect.title = "";
        }
        
        // Store current week ID in modal
        document.getElementById('editWeekModal').dataset.weekId = weekId;
        
        // Show recalculate option
        const recalcOption = document.getElementById('recalculateOption');
        const weekIndex = this.data.weeks.indexOf(week);
        if (weekIndex < this.data.weeks.length - 1) {
            recalcOption.style.display = 'block';
            document.getElementById('recalcFuture').checked = true;
        } else {
            recalcOption.style.display = 'none';
        }
        
        document.getElementById('editWeekModal').classList.add('active');
    },

    closeWeekEdit() {
        document.getElementById('editWeekModal').classList.remove('active');
    },

    saveWeekEdit() {
        const weekId = parseFloat(document.getElementById('editWeekModal').dataset.weekId);
        const week = this.data.weeks.find(w => w.id === weekId);
        if (!week) return;
        
        const newPrep = document.getElementById('editPrep').value;
        const newShare = document.getElementById('editShare').value;
        const recalc = document.getElementById('recalcFuture').checked;
        
        // Validation: Cannot be same person
        if (newPrep === newShare) {
            alert('Prep and Sharing cannot be the same person!');
            return;
        }
        
        // Update this week
        week.prep = newPrep;
        if (newShare) week.share = newShare; // Only update if changed
        
        // Mark as manually edited (removes fixed flag if sharing changed)
        week.manuallyEdited = true;
        if (week.share !== this.getFixedSharingPerson(week.rotationIndex)) {
            week.fixedShare = false; // Break from fixed rotation
        }
        
        this.saveData();
        
        // Recalculate future weeks if requested
        if (recalc) {
            this.recalculateFromWeek(weekId);
        } else {
            this.render();
            this.closeWeekEdit();
        }
    },

    recalculateFromWeek(fromWeekId) {
        const fromIndex = this.data.weeks.findIndex(w => w.id === fromWeekId);
        if (fromIndex === -1 || fromIndex === this.data.weeks.length - 1) {
            this.render();
            this.closeWeekEdit();
            return;
        }
        
        // Get current frequencies up to this point (including the edited week)
        const currentFreq = this.getFrequenciesUpToIndex(fromIndex);
        
        // Recalculate remaining weeks
        const futureWeeks = this.data.weeks.slice(fromIndex + 1);
        
        futureWeeks.forEach((week, idx) => {
            // If week has fixed sharing and wasn't manually edited, respect it
            if (week.fixedShare && !week.manuallyEdited) {
                const sharingPerson = week.share;
                // Find prep person with lowest current frequency who isn't the sharing person
                const candidates = this.data.members
                    .filter(m => m !== sharingPerson)
                    .sort((a, b) => (currentFreq[a]?.prep || 0) - (currentFreq[b]?.prep || 0));
                
                week.prep = candidates[0] || this.data.members.find(m => m !== sharingPerson);
                
                // Update frequency tracker
                currentFreq[week.prep] = currentFreq[week.prep] || {prep: 0, share: 0};
                currentFreq[week.prep].prep++;
            } else {
                // Both roles can be rebalanced
                const totalFreqs = this.data.members.map(m => ({
                    name: m,
                    total: (currentFreq[m]?.prep || 0) + (currentFreq[m]?.share || 0)
                })).sort((a, b) => a.total - b.total);
                
                // Assign prep to lowest, share to second lowest (different people)
                const prepPerson = totalFreqs[0].name;
                let sharePerson = totalFreqs[1]?.name || totalFreqs[0].name;
                
                // If only one person available, force different person
                if (prepPerson === sharePerson && this.data.members.length > 1) {
                    sharePerson = totalFreqs.find(p => p.name !== prepPerson)?.name || sharePerson;
                }
                
                week.prep = prepPerson;
                week.share = sharePerson;
                
                currentFreq[prepPerson] = currentFreq[prepPerson] || {prep: 0, share: 0};
                currentFreq[prepPerson].prep++;
                currentFreq[sharePerson] = currentFreq[sharePerson] || {prep: 0, share: 0};
                currentFreq[sharePerson].share++;
            }
        });
        
        this.saveData();
        this.render();
        this.closeWeekEdit();
        
        // Show confirmation
        const recalculatedCount = futureWeeks.length;
        setTimeout(() => {
            alert(`Recalculated ${recalculatedCount} future weeks to balance frequencies.`);
        }, 100);
    },

    getFrequenciesUpToIndex(index) {
        const freq = {};
        this.data.members.forEach(m => freq[m] = {prep: 0, share: 0});
        
        for (let i = 0; i <= index && i < this.data.weeks.length; i++) {
            const week = this.data.weeks[i];
            if (freq[week.prep]) freq[week.prep].prep++;
            if (freq[week.share]) freq[week.share].share++;
        }
        
        return freq;
    },

    // User Profile Functions
    openUserProfile() {
        this.renderUserNameSelect();
        this.loadNotificationSettings();
        document.getElementById('userProfileModal').classList.add('active');
    },

    closeUserProfile() {
        document.getElementById('userProfileModal').classList.remove('active');
    },

    renderUserNameSelect() {
        const select = document.getElementById('userNameSelect');
        const currentValue = this.data.userName || '';
        
        // Clear and rebuild options
        select.innerHTML = '<option value="">-- Select your name --</option>';
        
        this.data.members.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            if (member === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Update preview
        this.updateNamePreview(currentValue);
    },

    updateNamePreview(name) {
        const preview = document.getElementById('userNamePreview');
        const display = document.getElementById('selectedNameDisplay');
        
        if (name) {
            display.textContent = name;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    },

    handleUserNameChange() {
        const select = document.getElementById('userNameSelect');
        const newName = select.value;
        
        this.data.userName = newName;
        this.saveData();
        
        this.updateNamePreview(newName);
        this.updateUserDisplay();
        
        // Re-check notifications with new name
        if (this.data.notificationsEnabled) {
            this.checkUpcomingNotifications();
        }
    },

    updateUserDisplay() {
        const display = document.getElementById('userNameDisplay');
        const profileBtn = document.getElementById('userProfileBtn');
        
        if (this.data.userName) {
            display.textContent = `👤 ${this.data.userName}`;
            
            // Check if upcoming turn to highlight button
            const upcoming = this.getUpcomingTurn();
            if (upcoming && upcoming.daysUntil <= 7) {
                profileBtn.classList.add('has-turn');
            } else {
                profileBtn.classList.remove('has-turn');
            }
        } else {
            display.textContent = `👤 Set My Name`;
            profileBtn.classList.remove('has-turn');
        }
    },

    // Notification Functions
    async toggleNotifications() {
        const enabled = document.getElementById('notificationMasterToggle').checked;
        
        if (enabled) {
            // Request permission first
            const permission = await this.requestNotificationPermission();
            if (!permission) {
                document.getElementById('notificationMasterToggle').checked = false;
                this.updateNotificationStatus('denied');
                return;
            }
            
            // Validate user name is set
            if (!this.data.userName) {
                alert('Please select your name first!');
                document.getElementById('notificationMasterToggle').checked = false;
                return;
            }
        }
        
        this.data.notificationsEnabled = enabled;
        this.saveData();
        
        // Show/hide settings panel
        const settingsPanel = document.getElementById('notificationSettingsPanel');
        settingsPanel.style.display = enabled ? 'block' : 'none';
        
        this.updateNotificationStatus(enabled ? 'enabled' : 'disabled');
        
        if (enabled) {
            this.checkUpcomingNotifications();
            this.showNotification('Notifications Enabled', 
                `Hi ${this.data.userName}! You'll be reminded before your turn.`);
        }
    },

    updateNotificationType(type) {
        const isEnabled = document.getElementById(`notify${type.charAt(0).toUpperCase() + type.slice(1)}Toggle`).checked;
        this.data.notificationSettings[`notify${type.charAt(0).toUpperCase() + type.slice(1)}`] = isEnabled;
        
        // Show/hide timing container
        const container = document.getElementById(`${type}TimingContainer`);
        container.style.display = isEnabled ? 'block' : 'none';
        container.style.opacity = isEnabled ? '1' : '0.5';
        
        this.saveData();
    },

    updateNoticeTiming(type) {
        const minutes = parseInt(document.getElementById(`${type}NoticeSelect`).value);
        this.data.notificationSettings[`${type}Notice`] = minutes;
        this.saveData();
        
        // Preview the timing
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;
        let timeStr = '';
        if (days > 0) timeStr += `${days} day${days > 1 ? 's' : ''} `;
        if (hours > 0) timeStr += `${hours} hour${hours > 1 ? 's' : ''} `;
        if (mins > 0) timeStr += `${mins} min${mins > 1 ? 's' : ''}`;
        
        console.log(`${type} notice set to: ${timeStr.trim()} before`);
    },

    async requestNotificationPermission() {
        if (!("Notification" in window)) {
            alert("This browser does not support notifications");
            return false;
        }
        
        if (Notification.permission === "granted") {
            return true;
        }
        
        if (Notification.permission === "denied") {
            alert("Notifications are blocked. Please enable them in browser settings.");
            return false;
        }
        
        const permission = await Notification.requestPermission();
        return permission === "granted";
    },

    updateNotificationStatus(status) {
        const statusEl = document.getElementById('notificationStatus');
        
        switch(status) {
            case 'enabled':
                statusEl.innerHTML = '<span style="color: var(--secondary);">Notifications active</span>';
                break;
            case 'disabled':
                statusEl.innerHTML = '<span style="color: var(--text-light);">Notifications disabled</span>';
                break;
            case 'denied':
                statusEl.innerHTML = '<span style="color: var(--danger);">Permission denied - check browser settings</span>';
                break;
            default:
                statusEl.innerHTML = '';
        }
    },

    loadNotificationSettings() {
        const settings = this.data.notificationSettings || {};
        const masterToggle = document.getElementById('notificationMasterToggle');
        const settingsPanel = document.getElementById('notificationSettingsPanel');
        
        // Set master toggle
        masterToggle.checked = this.data.notificationsEnabled;
        
        // Show/hide settings panel
        settingsPanel.style.display = this.data.notificationsEnabled ? 'block' : 'none';
        
        // Set notification type toggles
        document.getElementById('notifyPrepToggle').checked = settings.notifyPrep !== false;
        document.getElementById('notifyShareToggle').checked = settings.notifyShare !== false;
        
        // Set timing dropdowns
        document.getElementById('prepNoticeSelect').value = settings.prepNotice || 1440;
        document.getElementById('shareNoticeSelect').value = settings.shareNotice || 1440;
        
        // Show/hide timing containers based on toggles
        document.getElementById('prepTimingContainer').style.display = 
            settings.notifyPrep !== false ? 'block' : 'none';
        document.getElementById('shareTimingContainer').style.display = 
            settings.notifyShare !== false ? 'block' : 'none';
        
        this.updateNotificationStatus(this.data.notificationsEnabled ? 'enabled' : 'disabled');
    },

    // Core Notification Logic
    checkUpcomingNotifications() {
        if (!this.data.userName || !this.data.notificationsEnabled) return;
        
        const now = new Date();
        const settings = this.data.notificationSettings;
        
        this.data.weeks.forEach(week => {
            const weekStart = new Date(week.startDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            // Check if week is in the future
            if (weekStart <= now) return; // Skip past/current weeks
            
            const msUntil = weekStart - now;
            const minutesUntil = Math.floor(msUntil / (1000 * 60));
            
            // Check Food Prep notification
            if (settings.notifyPrep !== false && week.prep === this.data.userName) {
                const noticeMinutes = settings.prepNotice || 1440;
                
                if (minutesUntil <= noticeMinutes && minutesUntil > 0) {
                    // Check if we already notified for this week
                    if (this.data.lastNotified?.prep !== week.id) {
                        this.sendTurnNotification('prep', week, minutesUntil);
                        this.data.lastNotified = this.data.lastNotified || {};
                        this.data.lastNotified.prep = week.id;
                        this.saveData();
                    }
                }
            }
            
            // Check Sharing notification
            if (settings.notifyShare !== false && week.share === this.data.userName) {
                const noticeMinutes = settings.shareNotice || 1440;
                
                if (minutesUntil <= noticeMinutes && minutesUntil > 0) {
                    if (this.data.lastNotified?.share !== week.id) {
                        this.sendTurnNotification('share', week, minutesUntil);
                        this.data.lastNotified = this.data.lastNotified || {};
                        this.data.lastNotified.share = week.id;
                        this.saveData();
                    }
                }
            }
        });
    },

    sendTurnNotification(type, week, minutesUntil) {
        const typeLabel = type === 'prep' ? 'FOOD PREP' : 'SHARING';
        const typeEmoji = type === 'prep' ? '🍳' : '🤝';
        
        // Format time until
        let timeStr;
        if (minutesUntil >= 1440) {
            const days = Math.round(minutesUntil / 1440);
            timeStr = `${days} day${days > 1 ? 's' : ''}`;
        } else if (minutesUntil >= 60) {
            const hours = Math.round(minutesUntil / 60);
            timeStr = `${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
            timeStr = `${minutesUntil} minutes`;
        }
        
        const title = `Your Turn in ${timeStr}!`;
        const body = `${typeEmoji} Hi ${this.data.userName}! You have ${typeLabel} duty starting ${new Date(week.startDate).toLocaleDateString()}`;
        
        // Browser notification
        this.showBrowserNotification(title, body);
        
        // In-app banner
        this.showInAppBanner(type, timeStr, typeLabel);
    },

    showBrowserNotification(title, body) {
        if (!this.data.notificationsEnabled) return;
        if (Notification.permission !== "granted") return;
        
        new Notification(title, {
            body: body,
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%234f46e5' width='192' height='192' rx='40'/%3E%3Ctext x='96' y='120' font-size='80' text-anchor='middle' fill='white'%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E",
            badge: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect fill='%234f46e5' width='192' height='192' rx='40'/%3E%3Ctext x='96' y='120' font-size='80' text-anchor='middle' fill='white'%3E%F0%9F%8D%BD%3C/text%3E%3C/svg%3E",
            tag: 'turn-notification',
            requireInteraction: false,
            renotify: true
        });
    },

    showInAppBanner(type, timeStr, typeLabel) {
        const banner = document.getElementById('turnBanner');
        const message = document.getElementById('turnMessage');
        const headerBtn = document.getElementById('userProfileBtn');
        
        banner.className = `notification-banner show my-turn-${type}`;
        message.innerHTML = `${type === 'prep' ? '🍳' : '🤝'} <strong>${timeStr} until your ${typeLabel} duty!</strong> Get ready!`;
        headerBtn.classList.add('has-turn');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            banner.classList.remove('show');
        }, 10000);
    },

    sendTestNotification() {
        if (!this.data.userName) {
            alert('Please select your name first!');
            return;
        }
        
        const prepTime = document.getElementById('prepNoticeSelect').value;
        const shareTime = document.getElementById('shareNoticeSelect').value;
        
        const testWeek = {
            startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            prep: this.data.userName,
            share: 'Someone Else'
        };
        
        // Show both types for testing
        if (this.data.notificationSettings.notifyPrep !== false) {
            this.sendTurnNotification('prep', testWeek, parseInt(prepTime));
        }
        
        setTimeout(() => {
            if (this.data.notificationSettings.notifyShare !== false) {
                this.sendTurnNotification('share', testWeek, parseInt(shareTime));
            }
        }, 2000);
        
        alert('Test notifications sent! Check your browser notifications.');
    },

    getUpcomingTurn() {
        if (!this.data.userName) return null;
        
        const now = new Date();
        
        for (const week of this.data.weeks) {
            const start = new Date(week.startDate);
            if (start > now) {
                const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
                
                if (week.prep === this.data.userName) {
                    return { type: 'prep', week, daysUntil };
                }
                if (week.share === this.data.userName) {
                    return { type: 'share', week, daysUntil };
                }
            }
        }
        return null;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.setFixedSharingRotation(['Nathan C', 'Acha', 'Cornelius', 'Yowil', 'Kezia', 'Joy', 'Hansel', 'Stanley', 'Dicky', 'Andrew Wijaya', 'Acha', 'Kiki', 'Cornelius', 'Stanley', 'Dicky', 'Nathan C', 'Kezia', 'Yowil', 'Valdo'])
    app.init();
});

document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') app.closeSettings();
});
document.getElementById('userProfileModal').addEventListener('click', (e) => {
    if (e.target.id === 'userProfileModal') app.closeUserProfile();
});