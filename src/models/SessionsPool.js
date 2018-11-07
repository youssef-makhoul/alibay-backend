let uuid = require('../utils/uuidGenerator');
//sessions
module.exports = class SessionsPool {
    constructor(sessions) {
        this.sessions = {};
        if (sessions) {
            this.sessions = sessions;
        };
        this.setNewSession = this.setNewSession.bind(this);
        this.getUserName = this.getUserName.bind(this);
        this.findSessionByUserName = this.findSessionByUserName.bind(this);
        this.removeSession = this.removeSession.bind(this);
    }
    setNewSession(username) {
        let existingSessionid = this.findSessionByUserName(username);
        if (existingSessionid)
            this.removeSession(existingSessionid);
        let id = uuid();
        this.sessions[id] = username;
        return id;
    };
    getUserName(sessionid) {
        return this.sessions[sessionid];
    }
    findSessionByUserName(username) {
        for (var key in this.sessions)
            if (this.sessions[key] == username) return key;
        return false;
    };
    removeSession(sessionid) {
        delete this.sessions[sessionid];
    };
}


//let sessionId = req.headers.cookie;