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

module.exports = mongoose.model('item', ItemSchema);