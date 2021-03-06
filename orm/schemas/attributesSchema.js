const mongoose      = require('mongoose');
const aquilaEvents  = require('../../utils/aquilaEvents');
const utilsDatabase = require('../../utils/database');
const Schema        = mongoose.Schema;
const ObjectId      = Schema.ObjectId;

/**
 * @typedef {object} AttributesSchema
 * @property {string} code.required
 * @property {string} type.required
 * @property {string} _type enum:products,users - default:products
 * @property {string} param.required
 * @property {array<string>} set_attributes setAttributes objectId
 * @property {number} position default:1
 * @property {object} default_value
 * @property {boolean} usedInRules default:true
 * @property {boolean} usedInFilters default:false
 * @property {object} translation
 */

const AttributesSchema = new Schema({
    code  : {type: String, required: true, unique: true},
    type  : {type: String, required: true},
    _type : {
        type    : String,
        enum    : ['products', 'users'],
        default : 'products'
    },
    param          : {type: String, required: true},
    set_attributes : [{type: ObjectId, ref: 'setAttributes'}],
    position       : {type: Number, default: 1},
    default_value  : {},
    usedInRules    : {type: Boolean, default: true},
    usedInFilters  : {type: Boolean, default: false},
    translation    : {}
});

AttributesSchema.statics.translationValidation = async function (self) {
    let errors = [];

    while (self.translation === undefined) {
        self.translation = {};
    }

    let translationKeys = Object.keys(self.translation);

    if (translationKeys.length === 0) {
        self.translation[global.defaultLang] = {};
        translationKeys                      = Object.keys(self.translation);
    }

    for (let i = 0; i < translationKeys.length; i++) {
        const lang = self.translation[translationKeys[i]];

        if (Object.keys(lang).length > 0) {
            if (lang.name === undefined) {
                errors.push('name manquant');
            }

            const {checkCustomFields} = require('../../utils/translation');
            errors                    = errors.concat(checkCustomFields(lang, `translation.${translationKeys[i]}`, [
                {key: 'name'},
                {key: 'values', type: 'object'}
            ]));
        }
    }

    return errors;
};

/**
 * Si un attribut est supprimé alors il faut reporter ces modifications dans les categories.filters.attributes et supprimer du tableau categories.filters.attributes
 * l'objet correspondant a l'attribut supprimé
 */
AttributesSchema.post('remove', async function (doc, next) {
    try {
        // On supprime du tableau categorie.filters.attributes l'objet attribut correspondant à l'attribut venant d'être supprimé
        const {_id}        = doc;
        const {Categories} = require('../models');
        await Categories.updateMany({'filters.attributes._id': _id}, {$pull: {'filters.attributes': {_id}}}, {new: true, runValidators: true});
    } catch (error) {
        return next(error);
    }
});

AttributesSchema.pre('updateOne', async function (next) {
    utilsDatabase.preUpdates(this, next, AttributesSchema);
});

AttributesSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, AttributesSchema);
});

/**
 * Lorsqu'un attribut est modifié alors on reporte la modification dans categorie.filters.attributes qui est un tableau d'attribut
 */
AttributesSchema.post('updateOne', async function ({next}) {
    try {
        const attribute = await this.findOne(this.getQuery());
        if (attribute) {
            const filters      = {
                'filters.attributes.$.position'    : attribute.position,
                'filters.attributes.$.type'        : attribute.type,
                'filters.attributes.$.translation' : attribute.translation
            };
            const {Categories} = require('../models');
            await Categories.updateMany({'filters.attributes._id': attribute._id}, {$set: filters}, {new: true, runValidators: true});
        }
    } catch (err) {
        return next(err);
    }
});

AttributesSchema.pre('save', async function (next) {
    const errors = await AttributesSchema.statics.translationValidation(this);
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

aquilaEvents.emit('attributesSchemaInit', AttributesSchema);

module.exports = AttributesSchema;