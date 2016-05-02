"use strict";

const fs = require("fs");
const Parser = require("node-source-walk");

const importType = "ImportDeclaration";
const callType = "CallExpression";

function getDeps(filePath, callback) {
  const name = filePath;
  const dependecies = [];
  const esParser = new Parser();

  fs.readFile(name, "utf8", (err, data) => {
    if (err) {
      return callback(err, null);
    }

    esParser.walk(data, node => {
      const type = node.type;
      const source = node.source || {};
      const callee = node.callee || {};
      const args = node.arguments || [];

      if (type === importType && source.value) {
        return dependecies.push(source.value);
      }

      if (type === callType && callee.name === "require" && args.length && args[0].value) {
        return dependecies.push(args[0].value);
      }
    });

    callback(null, dependecies);
  });
}

module.exports = getDeps;
