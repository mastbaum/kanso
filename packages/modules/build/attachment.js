var fs = require('fs'),
    mime = require('../../../deps/node-mime/mime'),
    jsp = require('../../../deps/UglifyJS/lib/parse-js'),
    pro = require('../../../deps/UglifyJS/lib/process'),
    modules = require('../../../lib/modules'),
    logger = require('../../../lib/logger'),
    utils = require('../../../lib/utils');


function minify(src) {
    var ast = jsp.parse(src);   // parse code and get the initial AST
    ast = pro.ast_mangle(ast);  // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    return pro.gen_code(ast);   // compressed code here
}


/**
 * Create kanso.js attachment using _modules property to find modules in the
 * design doc and wrap them with the appropriate boilerplate.
 */

module.exports = function (root, path, settings, doc, callback) {
    if (!doc._modules) {
        // TODO: should this throw?
        return callback(null, doc);
    }

    var wrapped_modules = '';
    for (var k in doc._modules) {
        wrapped_modules += modules.wrap(k, utils.getPropertyPath(doc, k));
    }

    delete doc._modules;

    fs.readFile(__dirname + '/bootstrap.js', function (err, content) {
        if (err) {
            return callback(err);
        }
        var data = content.toString();
        data += wrapped_modules || '';
        data += '\nkanso.init();';

        if (settings.minify) {
            logger.info('compressing', 'kanso.js');
            data = minify(data);
        }

        if (!doc._attachments) {
            doc._attachments = {};
        }
        doc._attachments['kanso.js'] = {
            'content_type': mime.lookup('kanso.js'),
            'data': new Buffer(data).toString('base64')
        };

        callback(null, doc);
    });
};
