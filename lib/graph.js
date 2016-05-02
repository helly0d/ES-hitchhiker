"use strict";

const glob = require("glob");
const path = require("path");
const readDeps = require("./read_deps");

const defaultOpts = {
  aliases: {},
  depsTransform: name => name
};

class Graph {
  constructor(modulePath, options) {
    if (!modulePath) {
      throw new Error("modulePath is required");
    }

    this.modulePath = modulePath;

    const opts = Object.assign({}, defaultOpts, options || {});
    this.aliases = opts.aliases;
    this.depsTransform = opts.depsTransform;

    this._graph = {};
  }

  buildRoutes() {
    this._graph = {};
    glob("**/@(*.js|*.jsx)", {cwd: this.modulePath}, (err, files) => {
      if (err) {
        return;
      }

      files.forEach(fileName => {
        const filePath = path.join(this.modulePath, fileName);
        if (this._graph[filePath]) {
          return console.warn("Duplicate", fileName);
        }

        this._graph[filePath] = {
          path: filePath,
          dependsOn: [],
          includedBy: [],
          isNodeModule: false
        };
      });

      this._buildDeps();
    });
  }

  _buildDeps() {
    Object.keys(this._graph).forEach(key => {
      readDeps(key, (err, deps) => {
        if (err) {
          return;
        }

        deps.forEach(dependency => this._computeNodeDependency(key, dependency));
      });
    });
  }

  _computeNodeDependency(key, dependency) {
    let depPath = "";
    const keyDir = path.parse(key).dir;

    if (dependency.startsWith("./") || dependency.startsWith("../")) {
      depPath = path.resolve(keyDir, dependency);
      if (!this._graph[depPath]) {
        depPath = this._getBestPath(depPath);
      }

      return this._addNodeDependency(key, depPath);
    }

    const aliases = Object.keys(this.aliases);
    for (let i = 0, n = aliases.length; i < n; i += 1) {
      if (dependency === aliases[i] || dependency.startsWith(`${aliases[i]}/`)) {
        depPath = dependency.replace(aliases[i], this.aliases[aliases[i]]);
        if (!this._graph[depPath]) {
          depPath = this._getBestPath(depPath);
        }
        return this._addNodeDependency(key, depPath);
      }
    }

    if (!this._graph[dependency]) {
      this._graph[dependency] = {
        path: dependency,
        dependsOn: [],
        includedBy: [],
        isNodeModule: true
      };
    }

    return this._addNodeDependency(key, dependency);
  }

  _addNodeDependency(key, dep) {
    if (this._graph[key] && this._graph[key].dependsOn.indexOf(dep) === -1) {
      this._graph[key].dependsOn.push(dep);
    }

    if (this._graph[dep] && this._graph[dep].includedBy.indexOf(key) === -1) {
      this._graph[dep].includedBy.push(key);
    }
  }

  _getBestPath(filePath) {
    let tempPath = path.join(filePath, "index.js");
    if (this._graph[tempPath]) {
      return tempPath;
    }

    tempPath = path.join(filePath, "index.jsx");
    if (this._graph[tempPath]) {
      return tempPath;
    }

    tempPath = `${filePath}.js`;
    if (this._graph[tempPath]) {
      return tempPath;
    }

    tempPath = `${filePath}.jsx`;
    if (this._graph[tempPath]) {
      return tempPath;
    }
  }
}

module.exports = Graph;
