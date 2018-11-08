let uuid = require('../utils/uuidGenerator');
//sessions
module.exports = class SessionsPool {
    constructor(sessions) {
        this.sessions = {};
        if (sessions) {
            this.sessions = sessions;
        };
        this.setNewSession = this.setNewSession.bind(this);
        this.getUserID = this.getUserID.bind(this);
        this.findSessionByUserId = this.findSessionByUserId.bind(this);
        this.removeSession = this.removeSession.bind(this);
    }
    setNewSession(userid) {
        let existingSessionid = this.findSessionByUserId(userid);
        if (existingSessionid)
            this.removeSession(existingSessionid);
        let id = uuid();
        this.sessions[id] = userid;
        return id;
    };
    getUserID(sessionid) {
        return this.sessions[sessionid];
    }
    findSessionByUserId(userid) {
        for (var key in this.sessions)
            if (this.sessions[key] == userid) return key;
        return false;
    };
    removeSession(sessionid) {
        delete this.sessions[sessionid];
    };
}


//let sessionId = req.headers.cookie;