var mongoose = require('mongoose');

let Schema = mongoose.Schema;

let ItemSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: false
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: false
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    }
});

ItemSchema.methods.getItemSimplified = function () {
    return {
        id: this._id,
        name: this.name,
        price: this.price,
        image: this.image
    };
};

ItemSchema.methods.getItem = function () {
    return {
        id: this._id,
        name: this.name,
        price: this.price,
        quantity: this.quantity,
        description: this.description,
        image: this.image,
        user: this.user.getUserSimplified()
    };
};

module.exports = mongoose.model('item', ItemSchema);