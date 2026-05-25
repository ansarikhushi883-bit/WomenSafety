// Lightweight client-side auth/profile storage using localStorage
(function(){
  window.app = {};
  function getUsers(){
    try{ return JSON.parse(localStorage.getItem('ws_users')||'{}'); }catch(e){return {};}
  }
  function saveUsers(u){ try{ localStorage.setItem('ws_users', JSON.stringify(u)); return true;}catch(e){return false;} }
  function normalizeEmail(e){ return (e||'').trim().toLowerCase(); }
  function nowStr(){ return new Date().toLocaleString(); }
  function getAlertKey(){
    var user = normalizeEmail(localStorage.getItem('currentUser') || '');
    return user ? 'ws_alerts_' + user : 'ws_alerts_guest';
  }
  function readAlerts(key){
    try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){return [];}
  }
  function saveAlerts(key, alerts){
    try{ localStorage.setItem(key, JSON.stringify(alerts)); }catch(e){}
  }
  function timeLabel(ts){
    var d = new Date(ts);
    if(isNaN(d.getTime())) return 'Just now';
    var today = new Date();
    if(d.toDateString() === today.toDateString()){
      return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }
    return d.toLocaleDateString([], {month:'short', day:'numeric'}) + ', ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  }

  window.isRegisteredEmail = function(email){
    var users = getUsers();
    return !!users[normalizeEmail(email)];
  };

  window.registerFromForm = function(){
    var first = (document.getElementById('reg-first')||{}).value || '';
    var last = (document.getElementById('reg-last')||{}).value || '';
    var email = normalizeEmail((document.getElementById('reg-email')||{}).value || '');
    var phone = (document.getElementById('reg-phone')||{}).value || '';
    var pw = (document.getElementById('reg-pw')||{}).value || '';
    var pw2 = (document.getElementById('reg-pw2')||{}).value || '';
    var city = (document.getElementById('reg-city')||{}).value || '';
    var address = (document.getElementById('reg-address')||{}).value || '';
    var emg1n = (document.getElementById('reg-emg1-name')||{}).value || '';
    var emg1p = (document.getElementById('reg-emg1-phone')||{}).value || '';
    var emg2p = (document.getElementById('reg-emg2-phone')||{}).value || '';
    // Role: find active role in reg-step
    var role='User';
    try{
      var roles = document.querySelectorAll('#reg-step-1 .role-btn');
      roles.forEach(function(r){ if(r.classList.contains('active')){ role = r.querySelector('.rl').textContent || role; } });
    }catch(e){}
    if(!first || !last || !email || !pw){ return {success:false,message:'Please provide name, email and password.'}; }
    if(pw !== pw2){ return {success:false,message:'Passwords do not match.'}; }
    var users = getUsers();
    if(users[email]){ return {success:false,message:'An account with this email already exists.'}; }
    var user = {
      first:first, last:last, name:first+' '+last,
      email:email, phone:phone, password:pw,
      city:city, address:address, role:role,
      contacts: [],
      memberSince: new Date().toLocaleDateString(),
      lastLogin: nowStr(),
      extra:{blood:'',dob:''}
    };
    if(emg1n || emg1p){ user.contacts.push({name:emg1n, phone:emg1p}); }
    if(emg2p){ user.contacts.push({name:'Contact 2', phone:emg2p}); }
    users[email]=user; saveUsers(users);
    return {success:true,user:user};
  };

  window.authenticate = function(email,pw){
    email = normalizeEmail(email);
    var users = getUsers();
    if(!users[email]) return {success:false, reason:'not_registered'};
    var u = users[email];
    if(u.password === pw){
      u.lastLogin = nowStr(); users[email]=u; saveUsers(users);
      try{ localStorage.setItem('currentUser', email); }catch(e){}
      return {success:true, user:u};
    }
    return {success:false, reason:'wrong_password'};
  };

  window.getCurrentUser = function(){
    try{
      var e = localStorage.getItem('currentUser');
      var users = getUsers();
      if(e){ return users[normalizeEmail(e)]||null; }
      return null;
    }catch(e){return null;}
  };
  window.logout = function(){ try{ localStorage.removeItem('currentUser'); window.location.href='index.html'; }catch(e){ window.location.href='index.html'; } };

  window.saveCurrentUser = function(updated, oldEmail){
    try{
      var users=getUsers();
      var nextEmail=normalizeEmail(updated.email);
      var prevEmail=normalizeEmail(oldEmail || localStorage.getItem('currentUser') || nextEmail);
      if(prevEmail && prevEmail !== nextEmail){ delete users[prevEmail]; }
      updated.email = nextEmail;
      users[nextEmail]=updated;
      saveUsers(users);
      localStorage.setItem('currentUser', nextEmail);
      return true;
    }catch(e){return false;}
  };

  window.recordSOSAlert = function(details){
    var createdAt = new Date().toISOString();
    var alert = {
      id: '#A-' + Math.floor(3000 + Math.random() * 7000),
      location: (details && details.location) || 'Live location shared',
      status: (details && details.status) || 'Sent',
      createdAt: createdAt
    };
    var key = getAlertKey();
    var alerts = readAlerts(key);
    alerts.unshift(alert);
    saveAlerts(key, alerts.slice(0, 30));
    return alert;
  };

  window.getStoredSOSAlerts = function(){
    var alerts = readAlerts(getAlertKey());
    var guestAlerts = readAlerts('ws_alerts_guest');
    var seen = {};
    return alerts.concat(guestAlerts).filter(function(a){
      var k = (a.id || '') + (a.createdAt || '');
      if(seen[k]) return false;
      seen[k] = true;
      return true;
    }).sort(function(a,b){
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }).slice(0, 30);
  };

  window.renderSOSAlertHistory = function(){
    var list = document.getElementById('alert-history-list');
    if(!list) return;
    var alerts = (typeof getStoredSOSAlerts === 'function') ? getStoredSOSAlerts() : [];
    if(!alerts.length) return;
    list.innerHTML = '';
    alerts.forEach(function(alert){
      var item=document.createElement('div');
      item.className='ram';
      item.innerHTML='<div class="ram-id">'+(alert.id || '#A-0000')+'</div><div class="ram-loc">📍 '+(alert.location || 'Live location shared')+'</div><div class="ram-time">'+timeLabel(alert.createdAt)+'</div><span class="ram-status">'+(alert.status || 'Sent')+'</span>';
      list.appendChild(item);
    });
    var title=document.getElementById('alert-history-title');
    if(title) title.innerHTML='🚨 My Alert History <span class="badge bm">'+alerts.length+' Saved</span>';
  };

  function setTip(id, done){
    var el=document.getElementById(id);
    if(el) el.classList.toggle('done', !!done);
  }

  function updateSafetyScore(u){
    var contacts = u.contacts || [];
    var hasProfile = !!(u.name && u.email && u.city && u.address && u.extra && u.extra.dob && u.extra.blood);
    var hasTwoContacts = contacts.length >= 2;
    var hasPhone = !!(u.phone && u.phone.trim());
    var hasThreeContacts = contacts.length >= 3;
    var score = 0;
    if(hasProfile) score += 25;
    if(hasTwoContacts) score += 25;
    if(hasPhone) score += 25;
    if(hasThreeContacts) score += 25;

    var num=document.getElementById('safety-score-num');
    var title=document.getElementById('safety-score-title');
    var progress=document.getElementById('score-progress');
    if(num) num.textContent = score;
    if(title) title.textContent = 'Safety Score: ' + score + ' / 100';
    if(progress) progress.style.strokeDashoffset = String(201 - (201 * score / 100));

    setTip('tip-profile', hasProfile);
    setTip('tip-two-contacts', hasTwoContacts);
    setTip('tip-phone', hasPhone);
    setTip('tip-three-contacts', hasThreeContacts);
  }

  // profile helpers: populate DOM
  window.populateProfile = function(){
    var u = getCurrentUser(); if(!u){ var no=document.getElementById('no-user'); if(no){ no.style.display='block'; } else { window.location.href='index.html'; } return; }
    u.extra = u.extra || {};
    var initials = ((u.first||'')[0] || '') + ((u.last||'')[0] || '');
    var avatar = document.getElementById('avatar'); if(avatar) avatar.textContent = initials.toUpperCase();
    var nameEl = document.getElementById('profile-name'); if(nameEl) nameEl.textContent = u.name;
    var contactEl = document.getElementById('profile-contact'); if(contactEl) contactEl.textContent = u.email + ' · ' + (u.phone||'');
    var roleTag = document.getElementById('role-tag'); if(roleTag) roleTag.textContent = (u.role || 'User');
    // personal info
    var fld = function(id,val){ var el=document.getElementById(id); if(el) el.textContent = val || ''; };
    fld('fullName',u.name);
    fld('dob',u.extra.dob || '—');
    fld('phoneVal', (u.phone||'') + (u.phone? ' ✅':'') );
    fld('emailVal', u.email);
    fld('cityVal', u.city || '');
    fld('bloodVal', u.extra.blood || '—');
    var formFld = function(id,val){ var el=document.getElementById(id); if(el) el.value = val || ''; };
    formFld('edit-name',u.name);
    formFld('edit-dob',(u.extra && u.extra.dob) || '');
    formFld('edit-phone',u.phone || '');
    formFld('edit-email',u.email || '');
    formFld('edit-city',u.city || '');
    formFld('edit-blood',(u.extra && u.extra.blood) || '');
    formFld('edit-address',u.address || '');
    // account info
    fld('roleVal', (u.role||'User'));
    fld('statusVal', '✅ Active & Verified');
    fld('memberSince', u.memberSince || '—');
    fld('lastLogin', u.lastLogin || '—');
    fld('twoFAVal', '⚠️ Not Enabled');
    // contacts
    var cl = document.getElementById('contacts-list'); if(cl){ cl.innerHTML = ''; if(u.contacts && u.contacts.length){ u.contacts.forEach(function(c,idx){
      var item = document.createElement('div'); item.className='contact-item';
      item.innerHTML = '<div class="contact-avatar" style="background:#fce8ec;color:#b5283a;">'+(c.name?c.name.split(' ').map(function(s){return s[0];}).slice(0,2).join(''):'?')+'</div>'+
                       '<div class="contact-info"><div class="cn">'+(c.name||'Contact')+'</div><div class="cr">Emergency Contact</div><div class="cp">'+(c.phone||'')+'</div></div>'+
                       '<button class="remove-btn">Remove</button>';
      var btn = item.querySelector('.remove-btn'); btn.addEventListener('click', function(){
        u.contacts.splice(idx,1); saveCurrentUser(u); populateProfile(); showToast('Contact removed');
      });
      cl.appendChild(item);
    }); } else { cl.innerHTML = '<div style="color:var(--muted);">No emergency contacts added.</div>'; } }
    // update contacts count badge if present
    try{ var cc = document.getElementById('contacts-count'); if(cc) cc.textContent = (u.contacts?u.contacts.length:0) + ' Added'; }catch(e){}
    renderSOSAlertHistory();
    updateSafetyScore(u);
  };

  window.addContactPrompt = function(){
    var u = getCurrentUser(); if(!u) return showToast('No user');
    var name = prompt('Contact name'); if(!name) return;
    var phone = prompt('Contact phone number'); if(!phone) return;
    u.contacts = u.contacts || []; u.contacts.push({name:name,phone:phone}); saveCurrentUser(u); populateProfile(); showToast('Contact added');
  };

  window.editProfilePrompt = function(){
    var form = document.getElementById('profile-form');
    if(form){ form.scrollIntoView({behavior:'smooth',block:'start'}); var first=document.getElementById('edit-name'); if(first) first.focus(); return; }
    var u = getCurrentUser(); if(!u) return showToast('No user');
    var name = prompt('Full name', u.name); if(!name) return;
    var phone = prompt('Phone', u.phone||''); if(phone===null) return;
    var city = prompt('City / Location', u.city||''); if(city===null) return;
    u.name = name; var parts = name.split(' '); u.first = parts[0]||''; u.last = parts.slice(1).join(' ')||''; u.phone = phone; u.city = city;
    saveCurrentUser(u); populateProfile(); showToast('Profile saved successfully!');
  };

  window.saveProfileForm = function(e){
    if(e && e.preventDefault) e.preventDefault();
    var u = getCurrentUser(); if(!u) return showToast('No user');
    var oldEmail = u.email;
    var name = ((document.getElementById('edit-name')||{}).value || '').trim();
    var email = normalizeEmail((document.getElementById('edit-email')||{}).value || '');
    if(!name || !email) return showToast('Name and email are required');
    var users = getUsers();
    if(email !== normalizeEmail(oldEmail) && users[email]) return showToast('Email already exists');
    var parts = name.split(/\s+/);
    u.name = name;
    u.first = parts[0] || '';
    u.last = parts.slice(1).join(' ');
    u.email = email;
    u.phone = ((document.getElementById('edit-phone')||{}).value || '').trim();
    u.city = ((document.getElementById('edit-city')||{}).value || '').trim();
    u.address = ((document.getElementById('edit-address')||{}).value || '').trim();
    u.extra = u.extra || {};
    u.extra.dob = ((document.getElementById('edit-dob')||{}).value || '').trim();
    u.extra.blood = ((document.getElementById('edit-blood')||{}).value || '').trim();
    if(saveCurrentUser(u, oldEmail)){ populateProfile(); showToast('Profile information saved'); }
    else showToast('Could not save profile');
  };

  // expose some helpers
  window.app.getUsers = getUsers; window.app.saveUsers = saveUsers;
})();
