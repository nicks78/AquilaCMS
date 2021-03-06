const bcrypt            = require('bcrypt');
const mongoose          = require('mongoose');
const PasswordValidator = require('password-validator');
const AddressSchema     = require('./addressSchema');
const aquilaEvents      = require('../../utils/aquilaEvents');
const Schema            = mongoose.Schema;
const ObjectId          = Schema.ObjectId;

/**
 * @see https://www.nayuki.io/page/random-password-generator-javascript
 */
const generateUserPassword = () => {
    const CHARACTER_SETS = [
        [true, '0123456789'],
        [true, 'abcdefghijklmnopqrstuvwxyz'],
        [true, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
        [false, '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~']
    ];

    const charset = [];
    for (const elem of CHARACTER_SETS) {
        if (elem[0]) {
            charset.push(...elem[1].split(''));
        }
    }
    // Generate password
    let result = '';
    for (let i = 0; i < 20; i++) result += charset[randomInt(charset.length)];
    return result;
};

// Returns a random integer in the range [0, n) using a variety of methods.
const randomInt = (n) => {
    const x = Math.floor(Math.random() * n);
    if (x < 0 || x >= n) throw new Error('Arithmetic exception');
    return x % n;
};

function validatePassword(password) {
    const validation = new PasswordValidator();
    validation.is().min(6).has().uppercase().has().lowercase().has().digits();
    return validation.validate(password);
}

/**
 * @typedef {object} UserSchema
 * @property {string} email.required
 * @property {string} password.required
 * @property {string} code
 * @property {boolean} active
 * @property {number} civility
 * @property {string} firstname
 * @property {string} lastname
 * @property {string} phone
 * @property {string} phone_mobile
 * @property {UserSchemaCompany} company
 * @property {string} status
 * @property {string} creationDate Date - default:Date.now
 * @property {number} delivery_address default:-1
 * @property {number} billing_address default:-1
 * @property {array<AddressSchema>} addresses
 * @property {boolean} isAdmin default:false
 * @property {object} campaign
 * @property {string} price
 * @property {boolean} taxDisplay default:true
 * @property {string} payementChoice
 * @property {boolean} isActiveAccount default:false
 * @property {string} activateAccountToken
 * @property {string} resetPassToken
 * @property {boolean} migrated default:false
 * @property {string} birthDate Date
 * @property {boolean} presentInLastImport
 * @property {array<string>} accessList
 * @property {object} details
 * @property {string} type
 * @property {string} preferredLanguage
 * @property {string} set_attributes setAttributes ObjectId
 * @property {array<UserSchemaAttributes>} attributes
 */

/**
 * @typedef {object} UserSchemaAttributes
 * @property {string} id attributes ObjectId
 * @property {string} code
 * @property {string} values
 * @property {string} param
 * @property {string} type default:unset
 * @property {object} translation
 * @property {number} position default:1
 */

/**
 * @typedef {object} UserSchemaCompany
 * @property {string} name
 * @property {string} siret
 * @property {string} intracom
 * @property {string} address
 * @property {string} postal_code
 * @property {string} town
 * @property {string} country
 * @property {UserSchemaContact} contact
 */

/**
 * @typedef {object} UserSchemaContact
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} phone
 */

/**
 * @typedef {object} UserSchemaCampaign
 * @property {string} referer
 * @property {string} utm_campaign
 * @property {string} utm_medium
 * @property {string} utm_source
 * @property {string} utm_content
 * @property {string} utm_term
 */
const UserSchema = new Schema({
    email : {
        type     : String,
        required : true,
        index    : {
            unique    : true,
            collation : {strength: 2}
        },
        validate : {
            validator(email) {
                return (new RegExp(/^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i)).test(email);
            },
            message : () => 'BAD_EMAIL_FORMAT'
        }
    },
    password : {
        type     : String,
        required : true,
        default  : generateUserPassword,
        validate : {
            validator : validatePassword,
            message   : () => 'FORMAT_PASSWORD'
        }
    },
    code     : {type: String, unique: true, sparse: true},
    active   : {type: Boolean},
    civility : {
        type : Number,
        enum : [0, 1] // 0 pour homme, 1 pour femme
    },
    firstname    : String,
    lastname     : String,
    phone        : String,
    phone_mobile : String,
    company      : {
        name        : String,
        siret       : String,
        intracom    : String,
        address     : String,
        postal_code : String,
        town        : String,
        country     : String,
        contact     : {
            first_name : String,
            last_name  : String,
            email      : String,
            phone      : String
        }
    },
    status           : String,
    creationDate     : {type: Date, default: Date.now},
    delivery_address : {type: Number, default: -1}, // index définissant l'addresse de livraison dans users.addresses
    billing_address  : {type: Number, default: -1}, // index définissant l'addresse de facturation dans users.addresses
    addresses        : [AddressSchema],
    isAdmin          : {type: Boolean, default: false},
    campaign         : {
        referer      : String,
        utm_campaign : String,
        utm_medium   : String,
        utm_source   : String,
        utm_content  : String,
        utm_term     : String
    },
    price                : String,
    taxDisplay           : {type: Boolean, default: true},
    payementChoice       : String,
    isActiveAccount      : {type: Boolean, default: false},
    activateAccountToken : {type: String, unique: true, sparse: true},
    resetPassToken       : {type: String, unique: true, sparse: true},
    migrated             : {type: Boolean, default: false},
    birthDate            : Date,
    presentInLastImport  : {type: Boolean},
    accessList           : [{type: String}],
    details              : {},
    type                 : String,
    preferredLanguage    : String,
    set_attributes       : {type: ObjectId, ref: 'setAttributes', index: true},
    attributes           : [
        {
            id          : {type: ObjectId, ref: 'attributes', index: true},
            code        : String,
            values      : String,
            param       : String,
            type        : {type: String, default: 'unset'},
            translation : {},
            position    : {type: Number, default: 1}
        }
    ]
});

UserSchema.set('toJSON', {virtuals: true});
UserSchema.set('toObject', {virtuals: true});
UserSchema.virtual('fullname').get(function () {
    return `${this.firstname ? this.firstname : ''} ${this.lastname ? this.lastname : ''}`;
});

UserSchema.post('validate', async function () {
    this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.validPassword = async function (password) {
    try {
        return bcrypt.compare(password, this.password);
    } catch (err) {
        return false;
    }
};

// RGPD : suppression des données associées à un user (orders et bills)
UserSchema.pre('remove', async function (next) {
    const {Orders, Bills} = require('../models');
    const bills           = await Bills.find({client: this._id});
    for (let i = 0; i < bills.length; i++) {
        bills[i].client = undefined;
        bills[i].save();
    }

    const orders = await Orders.find({'customer.id': this._id});
    for (let i = 0; i < orders.length; i++) {
        orders[i].customer.id = undefined;
        orders[i].save();
    }
    aquilaEvents.emit('aqRemoveUser', this);
    next();
});

UserSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

UserSchema.post('save', async function (doc) {
    if (doc.wasNew) {
        aquilaEvents.emit('aqNewUser', doc);
    } else {
        aquilaEvents.emit('aqUpdateUser', doc);
    }
});

UserSchema.post('update', function (result) {
    if ((result.ok && result.nModified === 1) || (result.result && result.result.ok && result.result.nModified === 1)) {
        aquilaEvents.emit('aqUpdateUser', this._conditions, this._update);
    }
});

UserSchema.post('findOneAndUpdate', function (result) {
    if (result) {
        aquilaEvents.emit('aqUpdateUser', {_id: result._id}, this._update);
    }
});

aquilaEvents.emit('userSchemaInit', UserSchema);

module.exports = UserSchema;
