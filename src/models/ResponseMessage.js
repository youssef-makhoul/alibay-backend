class ResponseMessage {
    constructor(success, message, obj) {
        this.success = success;
        this.message = message;
        this.obj = obj;
        this.toString = this.toString.bind(this);
    }
    toString() {
        if (!this.obj)
            return JSON.stringify({
                success: this.success,
                message: this.message
            });
        else {
            let OBJ = {};
            OBJ['success'] = this.success;
            OBJ['message'] = this.message;
            OBJ[this.obj.name] = this.obj.value;
            return JSON.stringify(OBJ);
        }
    }
}

module.exports = ResponseMessage;