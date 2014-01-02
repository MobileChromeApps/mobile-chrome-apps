/**
 * @namespace
 */
var RAL = {debug:false};
/**
 * Simple max-heap for a priority queue.
 */
RAL.Heap = function() {
  this.items = [];
};

RAL.Heap.prototype = {

  /**
   * Gets the next priority value based on the head's priority.
   */
  getNextHighestPriority: function() {
    var priority = 1;
    if(this.items[0]) {
      priority = this.items[0].priority + 1;
    }
    return priority;
  },

  /**
   * Provides the index of the parent.
   *
   * @param {number} index The start position.
   */
  parentIndex: function(index) {
    return Math.floor(index * 0.5);
  },

  /**
   * Provides the index of the left child.
   *
   * @param {number} index The start position.
   */
  leftChildIndex: function(index) {
    return index * 2;
  },

  /**
   * Provides the index of the right child.
   *
   * @param {number} index The start position.
   */
  rightChildIndex: function(index) {
    return (index * 2) + 1;
  },

  /**
   * Gets the value from a specific position
   * in the heap.
   *
   * @param {number} index The position of the element.
   */
  get: function(index) {
    var value = null;
    if(index >= 1 && this.items[index - 1]) {
      value = this.items[index - 1];
    }
    return value;
  },

  /**
   * Sets a value in the heap.
   *
   * @param {number} index The position in the heap.
   * @param {number} value The value to set.
   */
  set: function(index, value) {
    this.items[index - 1] = value;
  },

  /**
   * Swaps two values in the heap.
   *
   * @param {number} indexA Index of the first item to be swapped.
   * @param {number} indexB Index of the second item to be swapped.
   */
  swap: function(indexA, indexB) {
    var temp = this.get(indexA);
    this.set(indexA, this.get(indexB));
    this.set(indexB, temp);
  },

  /**
   * Sends a value up heap. The item is compared
   * to its parent item. If its value is greater
   * then it's swapped and the process is repeated.
   *
   * @param {number} startIndex The start position for the operation.
   */
  upHeap: function(startIndex) {

    var startValue = null,
        parentValue = null,
        parentIndex = null,
        switched = false;

    do {
      switched = false;
      parentIndex = this.parentIndex(startIndex);
      startValue = this.get(startIndex);
      parentValue = this.get(parentIndex);
      switched = parentValue !== null &&
        startValue.priority > parentValue.priority;

      if(switched) {
        this.swap(startIndex, parentIndex);
        startIndex = parentIndex;
      }

    } while(switched);
  },

  /**
   * Sends a value down heap. The item is compared
   * to its two children item. If its value is less
   * then it's swapped with the <em>highest value child</em>
   * and the process is repeated.
   *
   * @param {number} startIndex The start position for the operation.
   */
  downHeap: function(startIndex) {

    var startValue = null,
        leftChildValue = null,
        rightChildValue = null,
        leftChildIndex = null,
        rightChildIndex = null,
        switchValue = null,
        switched = false;

    do {

      switched = false;
      leftChildIndex = this.leftChildIndex(startIndex);
      rightChildIndex = this.rightChildIndex(startIndex);

      startValue = this.get(startIndex) && this.get(startIndex).priority;
      leftChildValue = this.get(leftChildIndex) && this.get(leftChildIndex).priority;
      rightChildValue = this.get(rightChildIndex) && this.get(rightChildIndex).priority;

      if(leftChildValue === null) {
        leftChildValue = Number.NEGATIVE_INFINITY;
      }
      if(rightChildValue === null) {
        rightChildValue = Number.NEGATIVE_INFINITY;
      }

      switchValue = Math.max(leftChildValue, rightChildValue);

      if(startValue < switchValue) {

        if(rightChildValue === switchValue) {
          this.swap(startIndex, rightChildIndex);
          startIndex = rightChildIndex;
        } else {
          this.swap(startIndex, leftChildIndex);
          startIndex = leftChildIndex;
        }

        switched = true;
      }

    } while(switched);

  },

  /**
   * Adds a value to the heap. For now this is just
   * numbers but a comparator function could be used
   * for more complex comparisons.
   *
   * @param {number} value The value to be added to the heap.
   */
  add: function(value) {
    this.items.push(value);
    this.upHeap(this.items.length);
  },

  /**
   * Removes the head of the heap.
   */
  remove: function() {
    var value = null;

    if(this.items.length) {
      // swap with the last child
      // in the heap
      this.swap(1, this.items.length);

      // grab the value and truncate
      // the item array
      value = this.get(this.items.length);
      this.items.length -= 1;

      // push the swapped item
      // down the heap to wherever it needs
      // to sit
      this.downHeap(1);
    }

    return value;
  }
};
/**
 * Sanitises a file path.
 */
RAL.Sanitiser = (function() {

  /**
   * Cleans and removes the protocol from the URL.
   * @param {string} url The URL to clean.
   */
  function cleanURL(url) {
    return url.replace(/.*?:\/\//, '', url);
  }

  return {
    cleanURL: cleanURL
  };

})();
/**
 * Parses cache headers so that we can respect them.
 */
RAL.CacheParser = (function() {

  /**
   * Parses headers to determine whether there is
   * anything in there that we need to know about, e.g.
   * no-cache or no-store.
   * @param {string} headers The XHR headers to parse.
   * @see http://www.mnot.net/cache_docs/
   * @returns {object} An object with the extracted expiry for the asset.
   */
  function parse(headers) {

    var rMaxAge = /max\-age=(\d+)/gi;
    var rNoCache = /Cache-Control:.*?no\-cache/gi;
    var rNoStore = /Cache-Control:.*?no\-store/gi;
    var rMustRevalidate = /Cache-Control:.*?must\-revalidate/gi;
    var rExpiry = /Expires:\s(.*)/gi;

    var warnings = [];
    var expires = rMaxAge.exec(headers);
    var useBy = Date.now();

    // check for no-store
    if(rNoStore.test(headers)) {
      warnings.push("Cache-Control: no-store is set");
    }

    // check for no-cache
    if(rNoCache.test(headers)) {
      warnings.push("Cache-Control: no-cache is set");
    }

    // check for must-revalidate
    if(rMustRevalidate.test(headers)) {
      warnings.push("Cache-Control: must-revalidate is set");
    }

    // if no max-age is set check
    // for an Expires value
    if(expires !== null) {
      useBy = Date.now() + (expires[1] * 1000);
    } else {

      // attempt to use the Expires: header
      expires = rExpiry.exec(headers);

      // if that fails warn
      if(expires !== null) {
        useBy = Date.parse(expires[1]);
      } else {
        warnings.push("Cache-Control: max-age and Expires: headers are not set");
      }
    }

    return {
      headers: headers,
      cacheable: (warnings.length === 0),
      useBy: useBy,
      warnings: warnings
    };
  }

  return {
    parse: parse
  };

})();
/**
 * FileSystem API wrapper. Makes extensive use of
 * the FileSystem code from Eric Bidelman.
 *
 * @see http://www.html5rocks.com/en/tutorials/file/filesystem/
 */
RAL.FileSystem = (function() {

  var ready = false,
      readyListeners = [],
      root = null,
      callbacks = {

        /**
         * Generic error handler, simply warns the user
         */
        onError: function(e) {
          var msg = '';

          switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
              msg = 'QUOTA_EXCEEDED_ERR';
              break;
            case FileError.NOT_FOUND_ERR:
              msg = 'NOT_FOUND_ERR';
              break;
            case FileError.SECURITY_ERR:
              msg = 'SECURITY_ERR';
              break;
            case FileError.INVALID_MODIFICATION_ERR:
              msg = 'INVALID_MODIFICATION_ERR';
              break;
            case FileError.INVALID_STATE_ERR:
              msg = 'INVALID_STATE_ERR';
              break;
            default:
              msg = 'Unknown Error';
              break;
          }

          console.error('Error: ' + msg, e);
        },

        /**
         * Callback for once the file system has been fired up.
         * Informs any listeners waiting on it.
         */
        onInitialised: function(fs) {
          root = fs.root;
          ready = true;

          if(readyListeners.length) {
            var listener = readyListeners.length;
            while(listener--) {
              readyListeners[listener]();
            }
          }
        }
      };

  /**
   * Determines if the file system is ready for use.
   * @returns {boolean} If the file system is ready.
   */
  function isReady() {
    return ready;
  }

  /**
   * Registers a listener for when the file system is
   * ready for interaction.
   * @param {Function} listener The listener function.
   */
  function registerOnReady(listener) {
    readyListeners.push(listener);
  }

  /**
   * Gets the internal file system URL for a stored file
   * @param {string} filePath The original URL of the asset.
   * @param {Function} callbackSuccess Callback for successful path retrieval.
   * @param {Function} callbackFail Callback for failed path retrieval.
   */
  function getPath(filePath, callbackSuccess, callbackFail) {
    if (ready) {

      filePath = RAL.Sanitiser.cleanURL(filePath);

      root.getFile(filePath, {}, function(fileEntry) {
        callbackSuccess(fileEntry.toURL());
      }, callbackFail);
    }
  }

  /**
   * Gets the file data as text for a stored file
   * @param {string} filePath The original URL of the asset.
   * @param {Function} callbackSuccess Callback for successful path retrieval.
   * @param {Function} callbackFail Callback for failed path retrieval.
   */
  function getDataAsText(filePath, callbackSuccess, callbackFail) {

    if (ready) {

      filePath = RAL.Sanitiser.cleanURL(filePath);

      root.getFile(filePath, {}, function(fileEntry) {

        fileEntry.file(function(file) {
          var reader = new FileReader();
          reader.onloadend = function(evt) {
            callbackSuccess(this.result);
          };

          reader.readAsText(file);
        });

      }, callbackFail);
    }
  }

  /**
   * Puts the file data in the file system.
   * @param {string} filePath The original URL of the asset.
   * @param {Blob} fileData The file data blob to store.
   * @param {Function} callback Callback for file storage.
   */
  function set(filePath, fileData, callback) {

    if(ready) {

      filePath = RAL.Sanitiser.cleanURL(filePath);

      var dirPath = filePath.split("/");
      dirPath.pop();

      // create the directories all the way
      // down to the path
      createDir(root, dirPath, function() {

        // now get a reference to our file, create it
        // if necessary
        root.getFile(filePath, {create: true}, function(fileEntry) {

          // create a writer on the file reference
          fileEntry.createWriter(function(fileWriter) {

            // catch on file ends
            fileWriter.onwriteend = function(e) {

              // update the writeend so when we have
              // truncated the file data we call the callback
              fileWriter.onwriteend = function(e) {
                callback(fileEntry.toURL());
              };

              // now truncate the file contents
              // for when we overwrite with a smaller file
              fileWriter.truncate(fileData.size);
            };

            // warn on write fails but right now don't bail
            fileWriter.onerror = function(e) {
              console.warn('Write failed: ' + e.toString());
            };

            // start writing
            fileWriter.write(fileData);

          }, callbacks.onError);

        }, callbacks.onError);
      });
    }
  }

  /**
   * Recursively creates the directories in a path.
   * @param {DirectoryEntry} rootDirEntry The base directory for this call.
   * @param {Array.<string>} dirs The subdirectories in this path.
   * @param {Function} onCreated The callback function to use when all
   *     directories have been created.
   */
  function createDir(rootDirEntry, dirs, onCreated) {

    // remove any empty or dot dirs
    if(dirs[0] === '.' || dirs[0] === '') {
      dirs = dirs.slice(1);
    }

    // on empty call this done
    if(!dirs.length) {
      onCreated();
    } else {

      // create the subdirectory and recursively call
      rootDirEntry.getDirectory(dirs[0], {create: true}, function(dirEntry) {
        if (dirs.length) {
          createDir(dirEntry, dirs.slice(1), onCreated);
        }
      }, callbacks.onError);
    }
  }

  /**
   * Removes a directory.
   * @param {string} path The directory to remove.
   * @param {Function} onRemoved The callback for successful deletion.
   * @param {Function} onCreated The callback for failed deletion.
   */
  function removeDir(path, onRemoved, onError) {
    if(ready) {
      root.getDirectory(path, {}, function(dirEntry) {
        dirEntry.removeRecursively(onRemoved, callbacks.onError);
      }, onError || callbacks.onError);
    }
  }

  /**
   * Removes a file.
   * @param {string} path The file to remove.
   * @param {Function} onRemoved The callback for successful deletion.
   * @param {Function} onCreated The callback for failed deletion.
   */
  function removeFile(path, onRemoved, onError) {
    if(ready) {
      root.getFile(path, {}, function(fileEntry) {
        fileEntry.remove(onRemoved, callbacks.onError);
      }, onError || callbacks.onError);
    }
  }

  /**
   * Initializes the file system.
   * @param {number} storageSize The storage size in MB.
   */
  (function init(storageSize) {

    storageSize = storageSize || 10;

    window.requestFileSystem = window.requestFileSystem ||
      window.webkitRequestFileSystem;

    window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL ||
      window.webkitResolveLocalFileSystemURL;

    if(!!window.requestFileSystem) {
      window.requestFileSystem(
        window.TEMPORARY,
        storageSize * 1024 * 1024,
        callbacks.onInitialised,
        callbacks.onError);
    } else {

    }
  })();

  return {
    isReady: isReady,
    registerOnReady: registerOnReady,
    getPath: getPath,
    getDataAsText: getDataAsText,
    set: set,
    removeFile: removeFile,
    removeDir: removeDir
  };
})();
/**
 * Represents the internal log of all files that
 * have been cached for offline use.
 */
RAL.FileManifest = (function() {

  var manifest = null,
      ready = false,
      readyListeners = [],
      saving = false,
      hasUpdated = false;

  /**
   * Determines if the manifest is ready for use.
   * @returns {boolean} If the manifest is ready.
   */
  function isReady() {
    return ready;
  }

  /**
   * Registers a listener for when the manifest is
   * ready for interaction.
   * @param {Function} listener The listener function.
   */
  function registerOnReady(listener) {
    readyListeners.push(listener);
  }

  /**
   * Gets the file information from the manifest.
   * @param {string} src The source URL of the asset.
   * @param {Function} callback The callback function to
   *      call with the asset details.
   */
  function get(src, callback) {
    var cleanSrc = RAL.Sanitiser.cleanURL(src);
    var fileInfo = manifest[cleanSrc] || null;
    callback(fileInfo);
  }

  /**
   * Sets the file information in the manifest.
   * @param {string} src The source URL of the asset.
   * @param {object} info The information to store against the asset.
   * @param {Function} callback The callback function to
   *      call once the asset details have been saved.
   */
  function set(src, info, callback) {
    var cleanSrc = RAL.Sanitiser.cleanURL(src);
    manifest[cleanSrc] = info;
    save(callback);
  }

  /**
   * Resets the manifest of files.
   */
  function reset() {
    manifest = {};
    save();
  }

  /**
   * Callback for when there is no manifest available.
   * @private
   */
  function onManifestUnavailable() {
    onManifestLoaded("{}");
  }

  /**
   * Callback for when there is no manifest has laded. Passes through the
   * registered ready callbacks and fires each in turn.
   * @param {string} The JSON representation of the manifest.
   * @private
   */
  function onManifestLoaded(fileData) {

    ready = true;
    manifest = JSON.parse(fileData);

    if (readyListeners.length) {
      var listener = readyListeners.length;
      while(listener--) {
        readyListeners[listener]();
      }
    }
  }

  /**
   * Saves the manifest file.
   * @private
   */
  function save(callback) {

    var blob = new Blob([
      JSON.stringify(manifest)
    ], {type: 'application/json'});

    // Called whether or not the file exists
    RAL.FileSystem.set("manifest.json", blob, function() {
      if(!!callback) {
        callback();
      }
    });
  }

  /**
   * Requests the manifest JSON file from the file system.
   */
  function init() {
    RAL.FileSystem.getDataAsText("manifest.json",
      onManifestLoaded,
      onManifestUnavailable);
  }

  // check if the file system is good to go. If not, then
  // flag that we want to know when it is.
  if (RAL.FileSystem.isReady()) {
    init();
  } else {
    RAL.FileSystem.registerOnReady(init);
  }

  return {
    isReady: isReady,
    registerOnReady: registerOnReady,
    get: get,
    set: set,
    reset: reset
  };

})();
/**
 * Prototype for all remote files
 */
RAL.RemoteFile = function() {};

RAL.RemoteFile.prototype = {

  /**
   * The internal element used for dispatching events.
   * @type {Element}
   */
  element: null,

  /**
   * The source URL of the remote file.
   * @type {string}
   */
  src: null,

  /**
   * Whether or not this file should autoload.
   * @type {boolean}
   */
  autoLoad: false,

  /**
   * Whether or not this file should ignore the server's cache headers.
   * @type {boolean}
   */
  ignoreCacheHeaders: false,

  /**
   * The default TTL (in ms) should no expire header be provided.
   * @type {number}
   * @default 1209600000, 14 days
   */
  timeToLive: 14 * 24 * 60 * 60 * 1000,

  /**
   * The file's priority in the queue.
   * @type {number}
   * @default 1209600000, 14 days
   */
  priority: 0,

  /**
   * Whether or not the file has loaded.
   * @type {boolean}
   */
  loaded: false,

  /**
   * A reference to the URL object.
   * @type {Function}
   * @private
   */
  wURL: window.URL || window.webkitURL,

  callbacks: {

    /**
     * Callback for errors with caching this file, e.g. when the headers
     * from the server imply as such.
     * @param {object} fileInfo The file information including headers and
     *     warnings from RAL.CacheParser
     */
    onCacheError: function(fileInfo) {
      fileInfo.src = this.src;
      this.sendEvent('cacheerror', fileInfo);
    },

    /**
     * Callback for when the remote file has loaded.
     * @param {Blob} fileData The file's data.
     * @param {object} fileInfo The file information including headers and
     *     any warnings from RAL.CacheParser
     */
    onRemoteFileLoaded: function(fileData, fileInfo) {

      // check the ignorance status
      if(this.ignoreCacheHeaders) {

        fileInfo.cacheable = true;
        fileInfo.useBy += this.timeToLive;
      }

      // check if the file can be cached and, if so,
      // go ahead and store it in the file system
      if(fileInfo.cacheable) {

        RAL.FileSystem.set(this.src, fileData,
          this.callbacks.onFileSystemSet.bind(this, fileInfo));

      } else {

        var dataURL = this.wURL.createObjectURL(fileData);
        this.callbacks.onLocalFileLoaded.call(this, dataURL);
        this.callbacks.onCacheError.call(this, fileInfo);

      }

      this.sendEvent('remoteloaded', fileInfo);

    },

    /**
     * Called when the remote file is unavailable.
     */
    onRemoteFileUnavailable: function() {
      this.sendEvent('remoteunavailable');
    },

    /**
     * Called when the local file has been loaded. Since the
     * remote file will be stored as a local file, this should
     * always be fired, but it may be preceded by a 'remoteloaded'
     * event beforehand.
     * @param {string} filePath The local file system path of the file.
     */
    onLocalFileLoaded: function(filePath) {
      this.loaded = true;
      this.sendEvent('loaded', filePath);
    },

    /**
     * Called when the locally stored version of the file is
     * not available, e.g. after a file system purge. This
     * automatically requests the remote file again and shows
     * a placeholder.
     */
    onLocalFileUnavailable: function() {
      this.showPlaceholder();
      this.loadFromRemote();
      this.sendEvent('localunavailable');
    },

    /**
     * Callback for once the file has been stored in the file system. Stores
     * the file in the global manifest.
     * @param {object} fileInfo The source URL and headers for the remote file.
     */
    onFileSystemSet: function(fileInfo) {
      RAL.FileManifest.set(this.src, fileInfo,
        this.callbacks.onFileManifestSet.bind(this));
    },

    /**
     * Callback for once the file has been stored in the file manifest.
     */
    onFileManifestSet: function() {
      // we stored the file, we should reattempt
      // the load operation
      this.load();
    },

    /**
     * Callback for once the file has been retrieved from the file manifest.
     * @param {object} fileInfo The file's information from the manifest.
     */
    onFileManifestGet: function(fileInfo) {

      var time = Date.now();

      // see whether we have the file
      if(fileInfo !== null) {

        // see if it is still in date or we are offline
        if(fileInfo.useBy > time || !RAL.NetworkMonitor.isOnline()) {

          // go and grab it
          RAL.FileSystem.getPath(this.src,
            this.callbacks.onLocalFileLoaded.bind(this),
            this.callbacks.onLocalFileUnavailable.bind(this));

        } else {
          // it's out of date, so now we
          // need to get the remote file
          this.loadFromRemote();
        }

      } else {
        // we do not have the file, go
        // and get it
        this.loadFromRemote();
      }
    }
  },

  /**
   * Helper function which uses the internal DOM element
   * to create and dispatch events for the remote file.
   * @see https://developer.mozilla.org/en-US/docs/DOM/document.createEvent
   * @param {string} evtName The event name.
   * @param {*} data The event data.
   */
  sendEvent: function(evtName, data) {

    this.checkForElement();

    var evt = document.createEvent("Event");
    evt.initEvent(evtName, true, true);
    if(!!data) {
      evt.data = data;
    }
    this.element.dispatchEvent(evt);

  },

  /**
   * Loads a file from a remote source.
   */
  loadFromRemote: function() {

    RAL.Loader.load(this.src,
      'blob',
      this.callbacks.onRemoteFileLoaded.bind(this),
      this.callbacks.onRemoteFileUnavailable.bind(this));

    this.sendEvent('remoteloadstart');
  },

  /**
   * Attempts to load a file from the local file system.
   */
  load: function() {
    // check the "manifest" to see if
    // we should already have this file
    RAL.FileManifest.get(this.src, this.callbacks.onFileManifestGet.bind(this));

  },

  /**
   * Checks for and creates an element for handling events.
   */
  checkForElement: function() {
    if(!this.element) {
      // create a placeholder element
      // in lieu of having an actual one. Likely
      // to be the case where someone has created
      // a RemoteFile directly
      this.element = document.createElement('span');
    }
  },

  /**
   * Wrapper for event listening on the internal element.
   * @param {string} evtName The event name to listen for.
   * @param {Function} callback The event callback.
   * @param {boolean} useCapture Use capture for the event.
   */
  addEventListener: function(evtName, callback, useCapture) {
    this.checkForElement();
    this.element.addEventListener(evtName, callback, useCapture);
  }
};
/**
 * Represents a remote image.
 * @param {object} options The configuration options.
 */
RAL.RemoteImage = function(options) {

  // make sure to override the prototype
  // refs with the ones for this instance
  RAL.RemoteFile.call(this);

  options = options || {};

  this.element = options.element || document.createElement('img');
  this.src = this.element.dataset.src || options.src;
  this.width = this.element.width || options.width || null;
  this.height = this.element.height || options.height || null;
  this.placeholder = this.element.dataset.placeholder || null;
  this.priority = options.priority || 0;

  // attach on specific events for images
  this.addEventListener('remoteloadstart', this.showPlaceholder.bind(this));
  this.addEventListener('loaded', this.showImage.bind(this));

  if(typeof options.autoLoad !== "undefined") {
    this.autoLoad = options.autoLoad;
  }

  if(typeof options.ignoreCacheHeaders !== "undefined") {
    this.ignoreCacheHeaders = options.ignoreCacheHeaders;
  }

  // if there is a TTL use that instead of the default
  if(this.ignoreCacheHeaders && typeof this.timeToLive !== "undefined") {
    this.timeToLive = options.timeToLive;
  }

  if(this.autoLoad) {
    this.load();
  } else {
    this.showPlaceholder();
  }

};

RAL.RemoteImage.prototype = new RAL.RemoteFile();

/**
 * Shows a placeholder image while we load in the main image
 */
RAL.RemoteImage.prototype.showPlaceholder = function() {

  if(this.placeholder !== null) {

    // add in transitions
    this.element.style['-webkit-transition'] = "background-image 0.5s ease-out";
    this.showImage({data:this.placeholder});
  }
};

/**
 * Shows the image.
 * @param {event} evt The loaded event for the asset.
 */
RAL.RemoteImage.prototype.showImage = function(evt) {

  var imageSrc = evt.data;
  var image = new Image();
  var revoke = (function(imageSrc) {
    this.wURL.revokeObjectURL(imageSrc);
  }).bind(this, imageSrc);

  var imageLoaded = function() {

    // infer the size from the image
    var width = this.width || image.naturalWidth;
    var height = this.height || image.naturalHeight;

    this.element.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    this.element.style.width = width + 'px';
    this.element.style.height = height + 'px';
    this.element.style.backgroundImage = 'url(' + imageSrc + ')';
    this.element.style.backgroundSize = width + 'px ' + height + 'px';

    // if it's a blob make sure we go ahead
    // and revoke it properly after a short timeout
    if(/blob:/.test(imageSrc)) {
      setTimeout(revoke, 100);
    }
  };

  image.onload = imageLoaded.bind(this);
  image.src = imageSrc;
};
/**
 * Loads the remote files
 */
RAL.Loader = (function() {

  var callbacks = {

    /**
     * Callback for loaded files.
     * @param {string} source The remote file's URL.
     * @param {Function} callbackSuccess The callback for successful loading.
     * @param {Function} callbackError The callback for failed loading.
     * @param {ProgressEvent} xhrProgressEvent The XHR progress event.
     */
    onLoad: function(source, callbackSuccess, callbackError, xhrProgressEvent) {

      // we have the file details
      // so now we need to wrap the file up, including
      // the caching information to return back
      var xhr = xhrProgressEvent.target;
      var fileData = xhr.response;
      var fileInfo = RAL.CacheParser.parse(xhr.getAllResponseHeaders());

      if(xhr.readyState === 4) {
        if(xhr.status === 200) {
          callbackSuccess(fileData, fileInfo);
        } else {
          callbackError(xhrProgressEvent);
        }
      }
    },

    /**
     * Generic callback for erroring loads. Simply passes the progres event
     * through to the assigned callback.
     * @param {Function} callback The callback for failed loading.
     * @param {ProgressEvent} xhrProgressEvent The XHR progress event.
     */
    onError: function(callback, xhrProgressEvent) {
      callback(xhrProgressEvent);
    }
  };

  /**
   * Aborts an in-flight XHR and reschedules it.
   * @param {XMLHttpRequest} xhr The XHR to abort.
   * @param {Function} callbackSuccess The callback for successful loading.
   * @param {Function} callbackError The callback for failed loading.
   * @param {ProgressEvent} xhrProgressEvent The XHR progress event.
   */
  function abort(xhr, source, callbackSuccess, callbackFail) {

    // kill the current request
    xhr.abort();

    // run it again, which will cause us to schedule up
    this.load(source, callbackSuccess, callbackFail);
  }

  /**
   * Aborts an in-flight XHR and reschedules it.
   * @param {XMLHttpRequest} xhr The XHR to abort.
   * @param {string} type The response type for the XHR, e.g. 'blob'
   * @param {Function} callbackSuccess The callback for successful loading.
   * @param {Function} callbackError The callback for failed loading.
   */
  function load(source, type, callbackSuccess, callbackFail) {

    // check we're online, or schedule the load
    if(RAL.NetworkMonitor.isOnline()) {

      // attempt to load the file
      var xhr = new XMLHttpRequest();

      xhr.onerror = callbacks.onError.bind(this, callbackFail);
      xhr.onload = callbacks.onLoad.bind(this, source, callbackSuccess, callbackFail);
      xhr.open('GET', source, true);
      xhr.responseType = type;
      xhr.send();

      // register our interest in the connection
      // being cut. If that happens we will reschedule.
      RAL.NetworkMonitor.registerForOffline(
        abort.bind(this,
          xhr,
          source,
          callbackSuccess,
          callbackFail));

    } else {

      // We are offline so register our interest in the
      // connection being restored.
      RAL.NetworkMonitor.registerForOnline(
        load.bind(this,
          source,
          callbackSuccess,
          callbackFail));

    }
  }

  return {
    load: load
  };

})();
/**
 * Tracks the online / offline nature of the
 * browser so we can abort and reschedule any
 * in-flight requests.
 */
RAL.NetworkMonitor = (function() {

  var onlineListeners = [];
  var offlineListeners = [];

  /* Register for online events */
  window.addEventListener("online", function() {

    // go through each listener, pop it
    // off and call it
    var listenerCount = onlineListeners.length,
        listener = null;
    while(listenerCount--) {
      listener = onlineListeners.pop();
      listener();
    }
  });

  /* Register for offline events */
  window.addEventListener("offline", function() {

    // go through each listener, pop it
    // off and call it
    var listenerCount = offlineListeners.length,
        listener = null;
    while(listenerCount--) {
      listener = offlineListeners.pop();
      listener();
    }
  });

  /**
   * Appends a function for notification
   * when the browser comes back online.
   * @param callback The callback function for online notifications.
   */
  function registerForOnline(callback) {
    onlineListeners.push(callback);
  }

  /**
   * Appends a function for notification
   * when the browser drops offline.
   * @param callback The callback function for offline notifications.
   */
  function registerForOffline(callback) {
    offlineListeners.push(callback);
  }

  /**
   * Simple wrapper for whether the browser
   * is online or offline.
   * @returns {boolean} The online / offline state of the browser.
   */
  function isOnline() {
    return window.navigator.onLine;
  }

  return {
    registerForOnline: registerForOnline,
    registerForOffline: registerForOffline,
    isOnline: isOnline
  };

})();
/**
 * Represents the load queue for assets.
 */
RAL.Queue = (function() {

  var heap = new RAL.Heap(),
      connections = 0,
      maxConnections = 6,
      callbacks = {

        /**
         * Callback for when a file in the queue has been loaded
         */
        onFileLoaded: function() {
          if(RAL.debug) {
            console.log("[Connections: " + connections + "] - File loaded");
          }
          connections--;
          start();
        }
      };

  /**
   * Gets the queue's next priority value.
   */
  function getNextHighestPriority() {
    return heap.getNextHighestPriority();
  }

  /**
   * Sets the queue's maximum number of concurrent requests.
   * @param {number} newMaxConnections The maximum number of in-flight requests.
   */
  function setMaxConnections(newMaxConnections) {
    maxConnections = newMaxConnections;
  }

  /**
   * Adds a file to the queue.
   * @param {RAL.REmoteFile} remoteFile The file to enqueue.
   * @param {boolean} startGetting Whether or not to try and get immediately.
   */
  function add(remoteFile, startGetting) {

    // ensure we have a priority, and
    // go with a LIFO approach
    // - thx courage@
    if(typeof remoteFile.priority === "undefined") {
      remoteFile.priority = heap.getNextHighestPriority();
    }

    heap.add(remoteFile);

    if(startGetting) {
      start();
    }
  }

  /**
   * Start requesting items from the queue.
   */
  function start() {
    while(connections < maxConnections) {
      nextFile = heap.remove();

      if(nextFile !== null) {
        nextFile.addEventListener('loaded', callbacks.onFileLoaded);
        nextFile.load();
        if(RAL.debug) {
          console.log("[Connections: " + connections + "] - Loading " + nextFile.src);
        }
        connections++;
      } else {
        if(RAL.debug) {
          console.log("[Connections: " + connections + "] - No more images queued");
        }
        break;
      }
    }
  }

  /**
   * Clears the queue.
   */
  function clear() {
    heap.clear();
  }

  return {
    getNextHighestPriority: getNextHighestPriority,
    setMaxConnections: setMaxConnections,
    add: add,
    clear: clear,
    start: start
  };

})();
