class ResponseMessage {
    constructor(success, message) {
        this.success = success;
        this.message = message;
        this.toString = this.toString.bind(this);
    }
    toString() {
        return JSON.stringify({
            success: this.success,
            message: this.message
        });
    }
}

module.exports = ResponseMessage;