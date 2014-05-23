/**
 * This object takes care of all the visualization:
 *
 * FEATURES
 * - Give it a JSON file which represents the 'scene'
 * - Allows users to selects elements of the scene to be rendered
 * - Allows basic image processing (thresholding, Volume Rendering (VR), Fibers Length Thresholding, etc.)
 * - Expose some functions
 *
 * TECHNOLOGY
 * - XTK
 * - xdatgui.js
 * - SliceDrop clone
 */

// Declare (or re-declare) the single global variable
viewer = viewer || {};


viewer.Viewer = function(jsonObj) {

	this.version = 0.0;
  //Parse the jason file  
  this.source = [
    { title: 'plugins', key : '1', folder : true,
      children : [
        { title: 'viewer', key : '2', folder : true,
          children : [
            { title: 'widget', key : '3', folder : true,
              children : [
              { title: 'data', key : '4', folder : true,
                children : [
                  { title: 'dicom', key : '5', folder : true,
                    children : [
                      { title: '0001-1.3.12.2.1107.5.2.32.35162.2012021516003275873755302_fullvol.dcm', 
                        key: '6',
                        type : 'volume', 
                        url  : 'plugins/viewer/widget/data/dicom/',
                        files : ['0001-1.3.12.2.1107.5.2.32.35162.2012021516003275873755302.dcm', 
                                 '0002-1.3.12.2.1107.5.2.32.35162.2012021516003288462855318.dcm',
                                 '0003-1.3.12.2.1107.5.2.32.35162.2012021516003360797655352.dcm',
                                 '0004-1.3.12.2.1107.5.2.32.35162.2012021516003411054655384.dcm',
                                 '0005-1.3.12.2.1107.5.2.32.35162.2012021516003465209455412.dcm']               
                      },        
                    ] 
                  },
                  { title: 'recon.nii', key: '7',
                    type : 'volume', 
                    url  : 'plugins/viewer/widget/data/',
                    files : ['recon.nii']
                  }, 
                  { title: 'tact.trk', key: '8',
                    type : 'fibers', 
                    url  : 'plugins/viewer/widget/data/',
                    files : ['tact.trk']
                  }, 
                  { title: 'lh.pial', key: '9',
                    type : 'mesh', 
                    url  : 'plugins/viewer/widget/data/',
                    files : ['lh.pial']
                  }, 
                  { title: 'rh.pial', key: '10',
                    type : 'mesh', 
                    url  : 'plugins/viewer/widget/data/',
                    files : ['rh.pial']
                  }
                ]
              }
             ]
           }
         ]
       }
      ]
    }
  ];

  //current scene
  this.scene = new viewer.Scene();
  this.scene.setVolume('plugins/viewer/widget/data/dicom/', ['0001-1.3.12.2.1107.5.2.32.35162.2012021516003275873755302.dcm', 
                                 '0002-1.3.12.2.1107.5.2.32.35162.2012021516003288462855318.dcm',
                                 '0003-1.3.12.2.1107.5.2.32.35162.2012021516003360797655352.dcm',
                                 '0004-1.3.12.2.1107.5.2.32.35162.2012021516003411054655384.dcm',
                                 '0005-1.3.12.2.1107.5.2.32.35162.2012021516003465209455412.dcm'] );
  //window.console.log('url: ' + json.fibers[0].url);
  this.scene.addFibers('plugins/viewer/widget/data/', 'tact.trk');
  this.scene.addMesh('plugins/viewer/widget/data/', 'lh.pial');
  // try to create and initialize a 3D renderer
  this._webGLFriendly = true;
  try {
    this.create3DRenderer('33d');
  } catch (Exception) { 
    this._webGLFriendly = false;
  }
  // create the 2D renderers for the X, Y, Z orientations
  this.create2DRenderer('sliceXX', 'X');
  this.create2DRenderer('sliceYY', 'Y');
  this.create2DRenderer('sliceZZ', 'Z');
  this.render();
}


viewer.Viewer.prototype.create3DRenderer = function(container) {
  this[container] = new X.renderer3D();
  this[container].bgColor = [.1, .1, .1];
  this[container].container = container;
  this[container].init();
}


viewer.Viewer.prototype.create2DRenderer = function(container, orientation) {
  this[container] = new X.renderer2D();
  this[container].container = container;
  this[container].orientation = orientation;
  this[container].init();
}


viewer.Viewer.prototype.render = function() {
  // Use a 2D renderer as the main renderer since this should work also on
  // non-webGL-friendly devices like Safari on iOS. Add the volume so it 
  // can be loaded and parsed
  this.sliceXX.add(this.scene.volume);
  // start the loading/rendering
  this.sliceXX.render();
  // the onShowtime method gets executed after all files were fully loaded and
  // just before the first rendering attempt
  var self = this;
  this.sliceXX.onShowtime = function() {
    // add the volume to the other 3 renderers
    self.sliceYY.add(self.scene.volume);
    //self.sliceYY.remove(self.volume)
    self.sliceYY.render(); 
    self.sliceZZ.add(self.scene.volume);
    self.sliceZZ.render();
    if (self._webGLFriendly) {
      self['33d'].add(self.scene.volume);
      for (var i = 0; i < self.scene.fibersList.length; i++) {
        self['33d'].add(self.scene.fibersList[i]);
      }
      for (i = 0; i < self.scene.meshList.length; i++) {
        self['33d'].add(self.scene.meshList[i]);
      }
      // the volume and geometric models are not in the same space, so
      // we configure some transforms in the onShowtime method which gets executed
      // after all files were fully loaded and just before the first rendering
      // attempt
      self['33d'].onShowtime = function() {
      // we reset the bounding box so track and mesh are in the same space
        self['33d'].resetBoundingBox();
      };
      // .. and start the loading and rendering!
      self['33d'].camera.position = [0, 0, 200];
      self['33d'].render();
    } 
    // now the volume GUI widgets

    
    self.createFileSelectWidget('tree');
    self.createVolWidget('xcontroller');
  };
}


viewer.Viewer.prototype.createVolWidget = function(container) {
  if (this.scene.volume) {
    var gui = new dat.GUI({ autoPlace: false });
    var customContainer = document.getElementById(container);
    customContainer.appendChild(gui.domElement);
    // $('.interactive_plugin_content').css("background-color", "#000");
    // the following configures the gui for interacting with the X.volume
    var volumegui = gui.addFolder('Volume');
    // now we can configure controllers which..
    // .. switch between slicing and volume rendering
    volumegui.add(this.scene.volume, 'volumeRendering');
    // .. configure the volume rendering opacity
    volumegui.add(this.scene.volume, 'opacity', 0, 1);
    // .. and the threshold in the min..max range
    volumegui.add(this.scene.volume, 'lowerThreshold', this.scene.volume.min, this.scene.volume.max);
    volumegui.add(this.scene.volume, 'upperThreshold', this.scene.volume.min, this.scene.volume.max);
    volumegui.add(this.scene.volume, 'windowLow', this.scene.volume.min, this.scene.volume.max);
    volumegui.add(this.scene.volume, 'windowHigh', this.scene.volume.min, this.scene.volume.max);
    // the indexX,Y,Z are the currently displayed slice indices in the range
    // 0..dimensions-1
    volumegui.add(this.scene.volume, 'indexX', 0, this.scene.volume.dimensions[0] - 1);
    volumegui.add(this.scene.volume, 'indexY', 0, this.scene.volume.dimensions[1] - 1);
    volumegui.add(this.scene.volume, 'indexZ', 0, this.scene.volume.dimensions[2] - 1);
    volumegui.open();
  }
}


viewer.Viewer.prototype.createFileSelectWidget = function(container) {
  $('#' + container).fancytree({
    checkbox: true,
    source: this.source
  });
}


viewer.Viewer.prototype.addObject = function() {


}


viewer.Viewer.prototype.removeObject = function() {


}


viewer.Viewer.prototype.onThreshold = function() {

  window.console.log('Lets threshold!');
  //this.threeDRenderer 

}


//Scene class
viewer.Scene = function() {
  //rendered volume 
  this.volume = new X.volume();
  //rendered fibers
  this.fibersList = [];
  //rendered meshes
  this.meshList = [];
}


viewer.Scene.prototype.setVolume = function(url, fileNames) {
  // for the dicom format, fileNames is a list of strings 
  // for other formats it's a list with just a single string 
  var orderedFiles = fileNames.sort().map(function(str) { 
    return url + str;});
  if (!this.volume.file || (this.volume.file[0] != orderedFiles[0])) {
    // attach the single-file dicom in .NRRD format
    // this works with gzip/gz/raw encoded NRRD files but XTK also supports other
    // formats like MGH/MGZ
    this.volume.file = orderedFiles;
  }
}


viewer.Scene.prototype.addFibers = function(url, fileName) {
  this.addGeomModel(url, fileName, 'fibers');
}


viewer.Scene.prototype.addMesh = function(url, fileName) {
  this.addGeomModel(url, fileName, 'mesh');
}


viewer.Scene.prototype.addGeomModel = function(url, fileName, type) {
  var tList = this.typeListPropertyName(type);
  var filePath = url + fileName;

  if (this.indexOfGeomModel(filePath, type) == -1) {
    var obj = new X[type]();
    obj.file = filePath;
    this[tList].push(obj);
  }
}


viewer.Scene.prototype.remGeomModel = function(url, fileName, type) {
  var tList = this.typeListPropertyName(type);
  var filePath = url + fileName;
  var ix = indexOfGeomModel(filePath, type);

  if ( ix != -1) {
    this[tList].splice(ix,1);
  }
}


viewer.Scene.prototype.indexOfGeomModel = function(filePath, type) {
  var tList = this.typeListPropertyName(type);
  var found = false;

  if (this[tList]) {
    for (var i = 0; i < this[tList].length; i++) {
      if (this[tList][i].file == filePath) {
        found = true;
        return i;
     }
    }
  }
  if (!found) {
    return -1;
  }
}


viewer.Scene.prototype.typeListPropertyName = function(type) {
  return type + 'List';
}


  /*   { title : '0001-1.3.12.2.1107.5.2.32.35162.2012021516003275873755302.dcm'
        url   : 'plugins/viewer/widget/data/dicom/',
        files : ['0001-1.3.12.2.1107.5.2.32.35162.2012021516003275873755302.dcm', 
                 '0002-1.3.12.2.1107.5.2.32.35162.2012021516003288462855318.dcm',
                 '0003-1.3.12.2.1107.5.2.32.35162.2012021516003360797655352.dcm',
                 '0004-1.3.12.2.1107.5.2.32.35162.2012021516003411054655384.dcm',
                 '0005-1.3.12.2.1107.5.2.32.35162.2012021516003465209455412.dcm'] }, 
      { url   : 'plugins/viewer/widget/data/', 
        files : ['recon.nii'] } ],
    fibers  : [
      { url   : 'plugins/viewer/widget/data/',
        files : ['tact.trk'] } ],
    models : [      
      { url   : 'plugins/viewer/widget/data/',
        files : ['lh.pial'] }, 
      { url   : 'plugins/viewer/widget/data/',
        files : ['rh.pial'] } ]; */