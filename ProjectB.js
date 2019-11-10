// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables----------------------------------
var canvas;		// main() sets this to the HTML-5 'canvas' element used for WebGL.
var gl;				// main() sets this to the rendering context for WebGL. This object
// holds ALL webGL functions as its members; I make it global here because we
// nearly all our program's functions need it to make WebGL calls.  All those
// functions would need 'gl' as an argument if we didn't make it a global var.
var u_ModelMatrix;     // **GPU location** of the 'u_ModelMatrix' uniform
var ANGLE_STEP = 45.0;		// Rotation angle rate (degrees/second)
var ANGLE_STEP_2 = 20.0;   // A different Rotation angle rate (degrees/second)
var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
var g_theta =-27.5;
													// (x,y,z,w)position + (r,g,b)color
													// Later, see if you can add:
													// (x,y,z) surface normal + (tx,ty) texture addr.
var g_angle01 = 0.0;        // animation angle 01 (degrees)
var g_angle02 = 0.0;        // animation angle 02 (degrees)
var g_last = Date.now();
var modelMatrix = new Matrix4();

	//------------For mouse click-and-drag: -------------------------------
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0;
var g_EyeX = -5.20, g_EyeY = 1.25, g_EyeZ = 1.2;
var g_lookX =1;
var g_lookY =1;
var g_lookZ = 1;
var foward_dis = 0;

function main() {
//==============================================================================
   window.addEventListener("keydown", myKeyDown, false);
   window.addEventListener("keyup", myKeyUp, false);
   window.addEventListener("mousedown", myMouseDown);
   window.addEventListener("mousemove", myMouseMove);
   window.addEventListener("mouseup", myMouseUp);
	window.addEventListener("click", myMouseClick);
	window.addEventListener("dblclick", myMouseDblClick);

  // Retrieve <canvas> element
  var myCanvas = document.getElementById('webgl');
	canvas = myCanvas;	// make it global--for everyone to use.
  // Get the rendering context for WebGL
  document.onkeydown= function(ev){keydown(ev); };
  var myGL = getWebGLContext(canvas);
  if (!myGL) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
	gl = myGL;	// make it global--for every function to use.

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  //

  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	 gl.enable(gl.DEPTH_TEST);

  // Get handle to graphics system's storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
//-----------------

  tick();							// start (and continue) animation: draw current image

}

function tick(){
	var nuCanvas = document.getElementById('webgl');	// get current canvas
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*3/4;
	gl = getWebGLContext(nuCanvas);

    animate();  // Update the rotation angle
    drawAll();   // Draw shapes
	document.getElementById('CurAngleDisplay').innerHTML=
			'g_angle01= '+g_angle01.toFixed(5);
	document.getElementById('CurAngleDisplay_2').innerHTML=
			'g_angle02= '+g_angle02.toFixed(5);
		 //Also display our current mouse-dragging state:
		document.getElementById('Mouse').innerHTML=
			'Mouse Drag totals (CVV coords):\t'+
			g_xMdragTot.toFixed(5)+', \t'+g_yMdragTot.toFixed(5);
    // report current angle on console
    //console.log('currentAngle=',currentAngle);
    requestAnimationFrame(tick, canvas);
    									// Request that the browser re-draw the webpage
}

function animate() {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  //if(g_angle01 >  45.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  //if(g_angle01 < -25.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  if(g_angle02 >  40.0 && ANGLE_STEP_2 > 0) ANGLE_STEP_2 = -ANGLE_STEP_2;
  if(g_angle02 < -50.0 && ANGLE_STEP_2 < 0) ANGLE_STEP_2 = -ANGLE_STEP_2;

  g_angle01 = g_angle01 + (ANGLE_STEP * elapsed) / 1000.0;
  g_angle02 = g_angle02 + (ANGLE_STEP_2 * elapsed) / 1000.0;
}

function initVertexBuffer(gl) {
//==============================================================================
// Create one giant vertex buffer object (VBO) that holds all vertices for all
// shapes.

 	// Make each 3D shape in its own array of vertices:
  makeCylinder();					// create, fill the cylVerts array
  makeSphere2();
  makeCylinder2();
  makeTorus2();						// create, fill the torVerts array
  makeGroundGrid();				// create, fill the gndVerts array
  makeAxes();
  makeRectangle();
  // how many floats total needed to store all shapes?
	var mySiz = (cylVerts.length + cylVerts2.length + sphVerts.length +
							 torVerts.length + gndVerts.length + AxesVerts.length + RecVerts.length);

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
  var colorShapes = new Float32Array(mySiz);
	// Copy them:  remember where to start for each shape:
	cylStart = 0;							// we stored the cylinder first.
  for(i=0,j=0; j< cylVerts.length; i++,j++) {
  	colorShapes[i] = cylVerts[j];
		}
		sphStart = i;						// next, we'll store the sphere;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
		}
		cyl2Start = i;							// we stored the cylinder first.
	for(j=0; j< cylVerts2.length; i++,j++) {
  	colorShapes[i] = cylVerts2[j];
		}
		torStart = i;						// next, we'll store the torus;
	for(j=0; j< torVerts.length; i++, j++) {
		colorShapes[i] = torVerts[j];
		}
		gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
		}
		axeStart = i;						// next we'll store the ground-plane;
	for(j=0; j< AxesVerts.length; i++, j++) {
		colorShapes[i] = AxesVerts[j];
		}
		recStart = i;						// next we'll store the ground-plane;
	for(j=0; j< RecVerts.length; i++, j++) {
		colorShapes[i] = RecVerts[j];
		}
  // Create a buffer object on the graphics hardware:
  var shapeBufferHandle = gl.createBuffer();
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  //Get graphics system's handle for our Vertex Shader's position-input variable:
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Use handle to specify how to retrieve **POSITION** data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, // Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve **COLOR** data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w

  gl.enableVertexAttribArray(a_Color);
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

// simple & quick--
// I didn't use any arguments such as color choices, # of verts,slices,bars, etc.
// YOU can improve these functions to accept useful arguments...
//
function makeDiamond() {
//==============================================================================
// Make a diamond-like shape from two adjacent tetrahedra, aligned with Z axis.

	// YOU write this one.  What would happen if you called makeSphere(), but
	// asked for only 2 slices (south-pole and north-pole end-caps) and 3 vertices
	// per slice?
}

function makeRectangle() {
	RecVerts = new Float32Array([
	    //rectagle
    1.0, -2.0, -1.0, 1.0,    0.5, 1.0, 0.0,  // Node 3
    1.0,  2.0, -1.0, 1.0,    0.0, 1.0, 0.8,  // Node 2
    1.0,  2.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 4

    1.0,  2.0,  1.0, 1.0,    0.5, 1.0, 0.0,  // Node 4
    1.0, -2.0,  1.0, 1.0,    0.0, 1.0, 0.8,  // Node 7
    1.0, -2.0, -1.0, 1.0,    0.0, 0.0, 1.0,  // Node 3

    // +y face: GREEN
    -1.0,  2.0, -1.0, 1.0,    1.0, 0.0, 0.0,  // Node 1
    -1.0,  2.0,  1.0, 1.0,    1.0, 1.0, 0.0,  // Node 5
     1.0,  2.0,  1.0, 1.0,    0.0, 1.0, 0.0,  // Node 4

     1.0,  2.0,  1.0, 1.0,    1.0, 0.1, 0.1,  // Node 4
     1.0,  2.0, -1.0, 1.0,    1.0, 0.1, 0.1,  // Node 2 
    -1.0,  2.0, -1.0, 1.0,    1.0, 0.0, 1.0,  // Node 1

    // +z face: BLUE Done

    -1.0,  2.0,  1.0, 1.0,    0.1, 0.1, 1.0,  // Node 5
    -1.0, -2.0,  1.0, 1.0,    1.0, 1.0, 0.1, // Node 6
     1.0, -2.0,  1.0, 1.0,    1.0, 0.1, 0.1,  // Node 7

     1.0, -2.0,  1.0, 1.0,    1.0, 0.1, 0.1,  // Node 7
     1.0,  2.0,  1.0, 1.0,    0.0, 1.0, 0.1,   // Node 4
    -1.0,  2.0,  1.0, 1.0,    0.1, 0.1, 1.0,  // Node 5

    // -x face: CYAN
    -1.0, -2.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 6 
    -1.0,  2.0,  1.0, 1.0,    1.0, 0.0, 0.0,// Node 5 
    -1.0,  2.0, -1.0, 1.0,    0.5, 0.0, 1.0,  // Node 1
    
    -1.0,  2.0, -1.0, 1.0,    1.0, 0.0, 0.0,  // Node 1
    -1.0, -2.0, -1.0, 1.0,    0.5, 0.0, 0.1,   // Node 0  
    -1.0, -2.0,  1.0, 1.0,    0.0, 0.0, 1.0,  // Node 6  
    
    // -y face: MAGENTA
     1.0, -2.0, -1.0, 1.0,    0.0, 1.0, 0.0,  // Node 3
     1.0, -2.0,  1.0, 1.0,    1.0, 1.0, 0.0,  // Node 7
    -1.0, -2.0,  1.0, 1.0,    1.0, 0.0, 0.0,  // Node 6

    -1.0, -2.0,  1.0, 1.0,    1.0, 0.0, 0.0,  // Node 6
    -1.0, -2.0, -1.0, 1.0,    1.0, 0.0, 1.0,  // Node 0
     1.0, -2.0, -1.0, 1.0,    0.0, 0.0, 1.0,  // Node 3

     // -z face: YELLOW
     1.0,  2.0, -1.0, 1.0,    1.0, 0.0, 0.0,  // Node 2
     1.0, -2.0, -1.0, 1.0,    1.0, 1.0, 0.0,  // Node 3
    -1.0, -2.0, -1.0, 1.0,    0.0, 1.0, 0.0,  // Node 0   

    -1.0, -2.0, -1.0, 1.0,    0.0, 1.0, 1.0,  // Node 0
    -1.0,  2.0, -1.0, 1.0,    0.0, 0.0, 1.0,  // Node 1
     1.0,  2.0, -1.0, 1.0,    0.5, 0.2, 1.0,  // Node 2
	]);
//==============================================================================
// Make a 4-cornered pyramid from one OpenGL TRIANGLE_STRIP primitive.
// All vertex coords are +/1 or zero; pyramid base is in xy plane.

  	// YOU write this one...
}

function makeAxes() {
//==============================================================================
// Make a cube with 4 triangles for each of its 6 faces, and with separately-
// specified colors for each faces' center and 4 corners.
// Create a (global) array to hold all of three axe's vertices;
		 AxesVerts = new Float32Array([
		     	// Drawing Axes: Draw them using gl.LINES drawing primitive;
     	// +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
		 0.0,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// X axis line (origin: gray)
		 1.3,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)
		 
		 0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  1.0,	// Y axis line (origin: white)
		 0.0,  1.3,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

		 0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white)
		 0.0,  0.0,  1.3, 1.0,		0.3,  0.3,  1.0,	//						 (endpoint: blue)
		 ]);// YOU write this one...
}

function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//

 var topColr = new Float32Array([0.8, 0.8, 0.8]);	// light yellow top,
 var walColr = new Float32Array([0.8, 0.2, 0.0]);	// red walls,
 var botColr = new Float32Array([0.8, 0.8, 0.0]);	// yellow bottom,
 var ctrColr = new Float32Array([0.8, 0.8, 0.0]); // near white end-cap centers,
 var errColr = new Float32Array([0.8, 0.8, 0.0]);	// Bright-red trouble color.

 var capVerts = 100;	// # of vertices around the topmost 'cap' of the shape
 var topRadius = 0.5;		// radius of top of cylinder (bottom is always 1.0)

 // Create a (global) array to hold all of this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
 // # of vertices * # of elements needed to store them. How many vertices?
										// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
 										// (includes blue transition-edge that links end-cap & wall);
 										// + Cylinder wall requires   (2*capVerts) vertices;
 										// + Cylinder top end-cap:    (2*capVerts) -1 vertices
 										// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	//
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before
		// we reach the starting vertex at 1,0,-1.
		if(v%2 ==0)
		{				// put even# vertices around bottom cap's outer edge,starting at v=0.
						// visit each outer-edge location only once; don't return to
						// to the location of the v=0 vertex (at 1,0,-1).
						// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0,
						// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*v/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*v/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cylVerts[j+2] =-2.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0];
			cylVerts[j+5]=botColr[1];
			cylVerts[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts[j+1] = 0.0;
			cylVerts[j+2] =-2.0;
			cylVerts[j+3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts[j+4]=ctrColr[0];
			cylVerts[j+5]=ctrColr[1];
			cylVerts[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again,
								// and put all even# verts along outer edge of bottom cap:
		{
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] =-2.0;	// ==z  BOTTOM cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr[]
				cylVerts[j+4]=walColr[0];
				cylVerts[j+5]=walColr[1];
				cylVerts[j+6]=walColr[2];
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0];
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
				}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
				cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] = 2.0;	// == z TOP cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr;
				cylVerts[j+4]=walColr[0];
				cylVerts[j+5]=walColr[1];
				cylVerts[j+6]=walColr[2];
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] = 2.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0];
			cylVerts[j+5]=topColr[1];
			cylVerts[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0];
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;
			cylVerts[j+2] = 2.0;
			cylVerts[j+3] = 1.0;
			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0];
			cylVerts[j+5]=ctrColr[1];
			cylVerts[j+6]=ctrColr[2];
		}
	}
}

function makeCylinder2() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//

 var topColr = new Float32Array([0.8, 0.8, 0.8]);	// light yellow top,
 var walColr = new Float32Array([0.8, 0.2, 0.0]);	// dark green walls,
 var botColr = new Float32Array([0.8, 0.8, 0.0]);	// light blue bottom,
 var ctrColr = new Float32Array([0.8, 0.8, 0.0]); // near black end-cap centers,
 var errColr = new Float32Array([0.8, 0.8, 0.0]);	// Bright-red trouble color.

 var capVerts = 100;	// # of vertices around the topmost 'cap' of the shape
 var topRadius = 1.0;		// radius of top of cylinder (bottom is always 1.0)

 // Create a (global) array to hold all of this cylinder's vertices;
 cylVerts2 = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
 // # of vertices * # of elements needed to store them. How many vertices?
										// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
 										// (includes blue transition-edge that links end-cap & wall);
 										// + Cylinder wall requires   (2*capVerts) vertices;
 										// + Cylinder top end-cap:    (2*capVerts) -1 vertices
 										// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	//
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before
		// we reach the starting vertex at 1,0,-1.
		if(v%2 ==0)
		{				// put even# vertices around bottom cap's outer edge,starting at v=0.
						// visit each outer-edge location only once; don't return to
						// to the location of the v=0 vertex (at 1,0,-1).
						// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0,
						// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cylVerts2[j  ] = Math.cos(Math.PI*v/capVerts);			// x
			cylVerts2[j+1] = Math.sin(Math.PI*v/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cylVerts2[j+2] =-1.0;	// z
			cylVerts2[j+3] = 1.0;	// w.
			// r,g,b = botColr[]
			cylVerts2[j+4]=botColr[0];
			cylVerts2[j+5]=botColr[1];
			cylVerts2[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts2[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts2[j+1] = 0.0;
			cylVerts2[j+2] =-1.0;
			cylVerts2[j+3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts2[j+4]=ctrColr[0];
			cylVerts2[j+5]=ctrColr[1];
			cylVerts2[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again,
								// and put all even# verts along outer edge of bottom cap:
		{
				cylVerts2[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts2[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts2[j+2] =-1.0;	// ==z  BOTTOM cap,
				cylVerts2[j+3] = 1.0;	// w.
				// r,g,b = walColr[]
				cylVerts2[j+4]=walColr[0];
				cylVerts2[j+5]=walColr[1];
				cylVerts2[j+6]=walColr[2];
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts2[j+4] = errColr[0];
					cylVerts2[j+5] = errColr[1];
					cylVerts2[j+6] = errColr[2];		// (make it red; see lecture notes)
				}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
				cylVerts2[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts2[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts2[j+2] = 1.0;	// == z TOP cap,
				cylVerts2[j+3] = 1.0;	// w.
				// r,g,b = walColr;
				cylVerts2[j+4]=walColr[0];
				cylVerts2[j+5]=walColr[1];
				cylVerts2[j+6]=walColr[2];
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			cylVerts2[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts2[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts2[j+2] = 1.0;	// z
			cylVerts2[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts2[j+4]=topColr[0];
			cylVerts2[j+5]=topColr[1];
			cylVerts2[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts2[j+4] = errColr[0];
					cylVerts2[j+5] = errColr[1];
					cylVerts2[j+6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts2[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts2[j+1] = 0.0;
			cylVerts2[j+2] = 1.0;
			cylVerts2[j+3] = 1.0;
			// r,g,b = topColr[]
			cylVerts2[j+4]=ctrColr[0];
			cylVerts2[j+5]=ctrColr[1];
			cylVerts2[j+6]=ctrColr[2];
		}
	}
}



function makeSphere2() {
//==============================================================================
// Make a sphere from one TRIANGLE_STRIP drawing primitive,  using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Sphere radius==1.0, centered at the origin, with 'south' pole at
// (x,y,z) = (0,0,-1) and 'north' pole at (0,0,+1).  The tri-strip starts at the
// south-pole end-cap spiraling upwards (in +z direction) in CCW direction as
// viewed from the origin looking down (from inside the sphere).
// Between the south end-cap and the north, it creates ring-like 'slices' that
// defined by parallel planes of constant z.  Each slice of the tri-strip
// makes up an equal-lattitude portion of the sphere, and the stepped-spiral
// slices follow the same design used to the makeCylinder2() function.
//
// (NOTE: you'll get better-looking results if you create a 'makeSphere3()
// function that uses the 'degenerate stepped spiral' design (Method 3 in
// lecture notes).
//

  var slices =100;		// # of slices of the sphere along the z axis, including
  									// the south-pole and north pole end caps. ( >=2 req'd)
  var sliceVerts = 100;	// # of vertices around the top edge of the slice
										// (same number of vertices on bottom of slice, too)
										// (HINT: odd# or prime#s help avoid accidental symmetry)
  var topColr = new Float32Array([0.8, 0.8, 0.0]);	// South Pole: dark-gray
  var botColr = new Float32Array([0.8, 0.8, 0.8]);	// North Pole: light-gray.
  var errColr = new Float32Array([0.8, 0.8, 0.0]);	// Bright-red trouble colr
  var sliceAngle = Math.PI/slices;	// One slice spans this fraction of the
  // 180 degree (Pi radian) lattitude angle between south pole and north pole.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices*2*sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them.
										// Each end-cap slice requires (2*sliceVerts -1) vertices
										// and each slice between them requires (2*sliceVerts).
	// Create the entire sphere as one single tri-strip array. This first for() loop steps through each 'slice', and the for() loop it contains steps through each vertex in the current slice.
	// INITIALIZE:
	var cosBot = 0.0;					// cosine and sine of the lattitude angle for
	var sinBot = 0.0;					// 	the current slice's BOTTOM (southward) edge.
	// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
	var cosTop = 0.0;					// "	" " for current slice's TOP (northward) edge
	var sinTop = 0.0;
	// for() loop's s var counts slices;
	// 				  its v var counts vertices;
	// 					its j var counts Float32Array elements
	//					(vertices * elements per vertex)
	var j = 0;							// initialize our array index
	var isFirstSlice = 1;		// ==1 ONLY while making south-pole slice; 0 otherwise
	var isLastSlice = 0;		// ==1 ONLY while making north-pole slice; 0 otherwise
	for(s=0; s<slices; s++) {	// for each slice of the sphere,---------------------
		// For current slice's top & bottom edges, find lattitude angle sin,cos:
		if(s==0) {
			isFirstSlice = 1;		// true ONLY when we're creating the south-pole slice
			cosBot =  0.0; 			// initialize: first slice's lower edge is south pole.
			sinBot = -1.0;			// (cos(lat) sets slice diameter; sin(lat) sets z )
		}
		else {					// otherwise, set new bottom edge == old top edge
			isFirstSlice = 0;
			cosBot = cosTop;
			sinBot = sinTop;
		}								// then compute sine,cosine of lattitude of new top edge.
		cosTop = Math.cos((-Math.PI/2) +(s+1)*sliceAngle);
		sinTop = Math.sin((-Math.PI/2) +(s+1)*sliceAngle);
		// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
		// (       use cos(lat) to set slice radius, sin(lat) to set slice z coord)
		// Go around entire slice; start at x axis, proceed in CCW direction
		// (as seen from origin inside the sphere), generating TRIANGLE_STRIP verts.
		// The vertex-counter 'v' starts at 0 at the start of each slice, but:
		// --the first slice (the South-pole end-cap) begins with v=1, because
		// 		its first vertex is on the TOP (northwards) side of the tri-strip
		// 		to ensure correct winding order (tri-strip's first triangle is CCW
		//		when seen from the outside of the sphere).
		// --the last slice (the North-pole end-cap) ends early (by one vertex)
		//		because its last vertex is on the BOTTOM (southwards) side of slice.
		//
		if(s==slices-1) isLastSlice=1;// (flag: skip last vertex of the last slice).
		for(v=isFirstSlice;    v< 2*sliceVerts-isLastSlice;   v++,j+=floatsPerVertex)
		{						// for each vertex of this slice,
			if(v%2 ==0) { // put vertices with even-numbered v at slice's bottom edge;
										// by circling CCW along longitude (east-west) angle 'theta':
										// (0 <= theta < 360deg, increases 'eastward' on sphere).
										// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
										// where			theta = 2*PI*(v/2)/capVerts = PI*v/capVerts
				sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
				sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
				sphVerts[j+2] = sinBot;																			// z
				sphVerts[j+3] = 1.0;																				// w.
			}
			else {	// put vertices with odd-numbered v at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI* ((v-1)/2)*sliceVerts)
							// (why (v-1)? because we want longitude angle 0 for vertex 1).
				sphVerts[j  ] = cosTop * Math.cos(Math.PI * (v-1)/sliceVerts); 	// x
				sphVerts[j+1] = cosTop * Math.sin(Math.PI * (v-1)/sliceVerts);	// y
				sphVerts[j+2] = sinTop;		// z
				sphVerts[j+3] = 1.0;
			}
			// finally, set some interesting colors for vertices:
			if(v==0) { 	// Troublesome vertex: this vertex gets shared between 3
			// important triangles; the last triangle of the previous slice, the
			// anti-diagonal 'step' triangle that connects previous slice and next
			// slice, and the first triangle of that next slice.  Smooth (Gouraud)
			// shading of this vertex prevents us from choosing separate colors for
			// each slice.  For a better solution, use the 'Degenerate Stepped Spiral'
			// (Method 3) described in the Lecture Notes.
				sphVerts[j+4]=errColr[0];
				sphVerts[j+5]=errColr[1];
				sphVerts[j+6]=errColr[2];
				}
			else if(isFirstSlice==1) {
				sphVerts[j+4]=botColr[0];
				sphVerts[j+5]=botColr[1];
				sphVerts[j+6]=botColr[2];
				}
			else if(isLastSlice==1) {
				sphVerts[j+4]=topColr[0];
				sphVerts[j+5]=topColr[1];
				sphVerts[j+6]=topColr[2];
			}
			else {	// for all non-top, not-bottom slices, set vertex colors randomly
					sphVerts[j+4]= Math.random()/2;  	// 0.0 <= red <= 0.5
					sphVerts[j+5]= Math.random()/2;		// 0.0 <= grn <= 0.5
					sphVerts[j+6]= Math.random()/2;		// 0.0 <= blu <= 0.5
			}
		}
	}
}

function makeTorus2() {
//==============================================================================
// Make a torus from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
//
// (NOTE: you'll get better-looking results if you create a 'makeSphere3()
// function that uses the 'degenerate stepped spiral' design (Method 3).
//
// 	Imagine a torus as a flexible, cylinder-shaped rod or tube bent into a
// circle around the z-axis. The bent tube's centerline forms a circle
// entirely in the z=0 plane, centered at the origin, with radius 'rBend'.
// Angle 'theta' measures position along the circle: it beings at theta=0 at
// the point (rBend,0,0) on the +x axis, and as theta grows greater than zero
// the circle extends in the counter-clockwise (CCW) or right-handed direction
// of rotation, moving towards the +y axis where theta will reach +90deg.,
// consistent with all the other right-handed coordinate systems.
// 		This bent tube forms a torus because the tube itself has a circular cross-
// section with radius 'rTube' , and we measure position on that circle by the
// angle 'phi'. Again we use the right-handed coordinate system to define 'phi':
// it measures angle in the CCW direction around the tube's centerline, circling
// right-handed along the direction of increasing theta.
// 	For example theta=0, phi=0 selects the torus surface point (rBend+rTube,0,0);
// a slight increase in angle phi moves the point in -z direction and a slight
// increase in theta moves that point in circularly towards the +y axis.
// To construct the torus,
// --we begin with the circle that forms the starting edge of the tube,
// where theta == 0 (e.g. the torus surface within the y=0 plane)
//					xc = rBend + rTube*cos(phi); 		// tube's circular crossection
//					yc = 0;
//					zc = -rTube*sin(phi);			(note NEGATIVE sin() this ensures that
//																		 increasing phi moves CCW around the torus
//                                     center-line direction, now at (0,+1,0)
// and then rotate the circle given by xc,yc,zc around the z-axis by angle theta:
//					x = xc*cos(theta) - yc*sin(theta)  // (contents of a 2D rot matrix)
//					y = xc*sin(theta) + yc*cos(theta)
//					z = zc
// Plug in the (xc,yc,zc) values from above & simplify. As yc==0, we can write:
//					x = (rBend + rTube*cos(phi))*cos(theta)
//					y = (rBend + rTube*cos(phi))*sin(theta)
//					z = -rTube*sin(phi)
//
var rTube = 0.5;										// Radius of the tube we bent to form a torus
var rBend = 1.0;										// Radius of circle made by tube's centerline
																		//(Set rTube <rBend to keep torus hole open!)
var tubeRings = 23;									// # of stepped-spiral rings(constant theta)
																		// along the entire length of the bent tube.
																		// (>=3 req'd: more for smoother bending)
var ringSides = 13;									// # of sides of each ring (and thus the
																		// number of vertices in their cross-section)
																		// >=3 req'd;more for rounder cross-sections)
// for nice-looking torus with approx square facets,
//			--choose odd or prime#  for ringSides, and
//			--choose odd or prime# for tubeRings of approx. ringSides *(rBend/rTube)
// EXAMPLE: rBend = 1, rTube = 0.5, tubeRings =23, ringSides = 11.

// Create a (global) array to hold this torus's vertices:
 torVerts = new Float32Array(floatsPerVertex*(2*ringSides*tubeRings +2));
//	Each slice requires 2*ringSides vertices, but 1st tubeRing will skip its
// first triangle where phi=0, leaving behind an empty triangular hole.
// Similarly, the last tubeRing will skip its last triangle. To 'close' the
// torus, we repeat the first 2 vertices at the end of the last tubeRing.
//  (Said another way: the first edge in the first tubeRing is parallel to
//
// the torus' center-line (an edge of constant phi), but that ring ends with a
// diagonal edge that goes up to the next ring, and leaves a triangular 'hole'.
// Similarly, the last edge of the last tubeRing is also parallel to the torus
// center-line. This leaves open 2 triangles.  We can fill them both by adding
// just 2 more vertices to the end of the triangle-strip, placed at the same
// location as the 1st two vertices in the triangle strip.)

var phi=0, theta=0;										// begin torus at angles 0,0
var thetaStep = 2*Math.PI/tubeRings;	// theta angle between each tube ring
var phiHalfStep = Math.PI/ringSides;	// half-phi angle between each ringSide
																			// (WHY HALF? 2 vertices per step in phi)
	// s counts rings along the tube;
	// v counts vertices within one ring (starts at 0 for each ring)
	// j counts array elements (vertices * floatsPerVertex) put in torVerts array.
	for(s=0,j=0; s<tubeRings; s++)
	{		// for each 'ring' of the torus:
		for(v=0; v< 2*ringSides; v++, j+=floatsPerVertex)
			{	// for each vertex in this segment:
			if(v%2==0)	{	// position the even #'d vertices at bottom of segment,
				torVerts[j  ] = (rBend + rTube*Math.cos((v)*phiHalfStep)) *
				                               Math.cos((s)*thetaStep);
							  //	x = (rBend + rTube*cos(phi)) * cos(theta)
				torVerts[j+1] = (rBend + rTube*Math.cos((v)*phiHalfStep)) *
				                               Math.sin((s)*thetaStep);
								//  y = (rBend + rTube*cos(phi)) * sin(theta)
				torVerts[j+2] = -rTube*Math.sin((v)*phiHalfStep);
								//  z = -rTube  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			else {				// odd #'d vertices at top of slice (s+1);
										// at same phi used at bottom of slice (v-1)
				torVerts[j  ] = (rBend + rTube*Math.cos((v-1)*phiHalfStep)) *
                                       Math.cos((s+1)*thetaStep);
							  //	x = (rBend + rTube*cos(phi)) * cos(NextTheta)
				torVerts[j+1] = (rBend + rTube*Math.cos((v-1)*phiHalfStep)) *
				                               Math.sin((s+1)*thetaStep);
								//  y = (rBend + rTube*cos(phi)) * sin(NextTheta)
				torVerts[j+2] = -rTube*Math.sin((v-1)*phiHalfStep);
								//  z = -rTube  *   sin(phi)
				torVerts[j+3] = 1.0;		// w
			}
			if(v==0 && s!=0) {		// 'troublesome' vertex shared by step & 2 rings
				torVerts[j+4] = 1.0;		//  BRIGHT RED to show its location.
				torVerts[j+5] = 0.2;
				torVerts[j+6] = 0.2;
			}
			else {
				torVerts[j+4] = Math.random()/2;		// random color 0.0 <= R < 0.5
				torVerts[j+5] = Math.random()/2;		// random color 0.0 <= G < 0.5
				torVerts[j+6] = Math.random()/2;		// random color 0.0 <= B < 0.5
				}
		}
	}
	// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
	// (curious? put these two vertices at the origin to see them on-screen)
			torVerts[j  ] = rBend + rTube;	// copy vertex zero;
						  //	x = (rBend + rTube*cos(phi==0)) * cos(theta==0)
			torVerts[j+1] = 0.0;
							//  y = (rBend + rTube*cos(phi==0)) * sin(theta==0)
			torVerts[j+2] = 0.0;
							//  z = -rTube  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random()/2;		// random color 0.0 <= R < 0.5
			torVerts[j+5] = Math.random()/2;		// random color 0.0 <= G < 0.5
			torVerts[j+6] = Math.random()/2;		// random color 0.0 <= B < 0.5
			j+=7; // go to next vertex:
			torVerts[j  ] = (rBend + rTube) * Math.cos(thetaStep);
						  //	x = (rBend + rBar*cos(phi==0)) * cos(theta==thetaStep)
			torVerts[j+1] = (rBend + rTube) * Math.sin(thetaStep);
							//  y = (rBend + rTube*cos(phi==0)) * sin(theta==thetaStep)
			torVerts[j+2] = 0.0;
							//  z = -rTube  *   sin(phi==0)
			torVerts[j+3] = 1.0;		// w
			torVerts[j+4] = Math.random()/2;		// random color 0.0 <= R < 0.5
			torVerts[j+5] = Math.random()/2;		// random color 0.0 <= G < 0.5
			torVerts[j+6] = Math.random()/2;		// random color 0.0 <= B < 0.5
			// DONE!
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at the origin.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;
	var xymax	= 100.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.0]);	// bright yellow
 	var yColr = new Float32Array([0.0, 1.0, 0.0]);	// bright green.

	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.

	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))

	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function drawAll(){
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  console.log(gl.drawingBufferWidth);
  console.log(gl.drawingBufferHeight);
  
  gl.viewport(0,											 				// Viewport lower-left corner
							0, 			// location(in pixels)
  						gl.drawingBufferWidth/2, 					// viewport width,
  						gl.drawingBufferHeight);			// viewport height in pixels.

  var vpAspect = gl.drawingBufferWidth /			// On-screen aspect ratio for
								gl.drawingBufferHeight;		// this camera: width/height.



  modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
  modelMatrix.perspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
                           vpAspect,   // Image Aspect Ratio: camera lens width/height
                           1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        1000.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)



  var g_atX=g_EyeX+Math.cos(g_theta * Math.PI / 180);
  var g_atY=g_EyeY+Math.sin(g_theta * Math.PI / 180);
  g_lookX = g_atX;
  g_lookY =g_atY;

  console.log("The look at x is "+g_atX);
  console.log("The look at y is "+g_atY);
  console.log(g_theta);


  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_lookX, g_lookY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

       // SAVE world coord system;
    modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(0.7, 0.7, 0.7);				// shrink by 10X:

	drawGrid();
	modelMatrix.scale(100, 100, 100);
	drawAxes();
	modelMatrix.scale(0.01, 0.01, 0.01);
	
	
//===================Draw FIRST OBJECT(Tower):

  //-------Draw lower Spinning Cylinder:
    modelMatrix.scale(1/7,1/7,1/7);
	modelMatrix.translate(-0.6,0.6, 0.0);
	modelMatrix.scale(1.5, 1.5, 1.5);
	//modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01, 0,1,1);
	// Drawing:
  // Pass our current matrix to the vertex shaders:
    drawCylinder();


  //===========================================================
  //
	//pushMatrix(modelMatrix);  // SAVE world drawing coords.

	modelMatrix.translate(0,0,2.5);
	modelMatrix.scale(1, 1, 0.5);
	modelMatrix.rotate(g_angle01, 0,0,1);
	drawSphere();

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	
	

    modelMatrix.translate(-3,0, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();
	
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
	pushMatrix(modelMatrix);  // SAVE world drawing coords.
    
	
	modelMatrix.translate(0,3, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	
    modelMatrix.translate(0,-3, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(-90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

			  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(3,0, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(-90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();
	
	
	
	
	//===================Draw Second OBJECT(WindMill):

 modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
  modelMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
                           vpAspect,   // Image Aspect Ratio: camera lens width/height
                           1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        1000.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_atX, g_atY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

       // SAVE world coord system;
    modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:


	
	//drawGrid();	
	 modelMatrix.translate(0,30,3);  



	modelMatrix.scale(2, 2, 2);
	modelMatrix.rotate(90, 0, 0, 1);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	modelMatrix.translate(0,0,2.25);
	modelMatrix.scale(0.5, 0.5, 0.25);
	modelMatrix.rotate(90, 0, 0, 1);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawSphere();

	modelMatrix.translate(-1.6,0,0);
	modelMatrix.scale(0.5, 0.5, 0.5);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder2();

	modelMatrix.translate(0,0,-2);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 0, 0, 1);
	modelMatrix.rotate(g_angle01, 0,0,1);
	drawSphere();

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	modelMatrix.translate(-7,0,0);
	modelMatrix.scale(3, 0.5, 0.5);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.

  	modelMatrix.translate(7,0,0);
	modelMatrix.scale(3, 0.5, 0.5);
	modelMatrix.rotate(-90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.

  	modelMatrix.translate(0,-7,0);
	modelMatrix.scale(0.5, 3, 0.5);
	modelMatrix.rotate(-90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

			modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.

  	modelMatrix.translate(0,7,0);
	modelMatrix.scale(0.5, 3, 0.5);
	modelMatrix.rotate(90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();




	//===================Draw Third OBJECT(Helicopter):
	modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
    modelMatrix.perspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
                           vpAspect,   // Image Aspect Ratio: camera lens width/height
                           1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        1000.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_atX, g_atY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

	//modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

	//drawGrid();
	modelMatrix.translate(30,-30, 0.0);
	modelMatrix.scale(6,6,3);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(-120, 0, 0, 1);
	//modelMatrix.rotate(g_angle01, 0,1,1);
	// Drawing:
  // Pass our current matrix to the vertex shaders:
    drawCylinder2();

	//pushMatrix(modelMatrix);  // SAVE world drawing coords.

	modelMatrix.translate(0,0, -1.8);
	modelMatrix.scale(0.8, 0.8, 0.8);
	//modelMatrix.rotate(, 0, 0, 1);
	//modelMatrix.rotate(g_angle01, 0,1,1);
	// Drawing:
  // Pass our current matrix to the vertex shaders:
    drawCylinder();

  //===========================================================
  //
	//modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
	//pushMatrix(modelMatrix);  // SAVE world drawing coords.
	

	modelMatrix.translate(-1.65,0,2);
	modelMatrix.scale(0.4, 0.4, 0.4);
	modelMatrix.rotate(90, 0,1,0);
	modelMatrix.rotate(g_angle01, 0,0,1);
	drawSphere();

	pushMatrix(modelMatrix);

    modelMatrix.translate(-3,0, 0);
	modelMatrix.scale(3, 0.5, 0.5);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(0,3, 0);
	modelMatrix.scale(0.5, 3, 0.5);
	modelMatrix.rotate(90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(0,-3, 0);
	modelMatrix.scale(0.5, 3, 0.5);
	modelMatrix.rotate(-90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(3,0, 0);
	modelMatrix.scale(3, 0.5, 0.5);
	modelMatrix.rotate(-90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();
	
	//modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.


	//===================Draw Fourth OBJECT(Rectangle):
	
modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
    modelMatrix.perspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
                           vpAspect,   // Image Aspect Ratio: camera lens width/height
                           1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        1000.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_atX, g_atY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

	//modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(0.1, 0.1, 0.1);
	 modelMatrix.translate(3,0, 0);
	 drawRectangle();
	  
	

	//right screen:
	//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  console.log(gl.drawingBufferWidth);
  console.log(gl.drawingBufferHeight);
  
  gl.viewport(gl.drawingBufferWidth/2,											 				// Viewport lower-left corner
							0, 			// location(in pixels)
  						gl.drawingBufferWidth/2, 					// viewport width,
  						gl.drawingBufferHeight);			// viewport height in pixels.

  //var vpAspect = gl.drawingBufferWidth /			// On-screen aspect ratio for
								//gl.drawingBufferHeight;		// this camera: width/height.



  modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
  modelMatrix.ortho(-5,5,
					-5,5  // FOVY: top-to-bottom vertical image angle, in degrees
					,-30,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        30);  // camera z-far distance (always positive; frustum ends at z = -zfar)



  //var g_atX=g_EyeX+Math.cos(g_theta * Math.PI / 180);
  //var g_atY=g_EyeY+Math.sin(g_theta * Math.PI / 180);
  //g_lookX = g_atX;
  //g_lookY =g_atY;

  console.log("The look at x is "+g_atX);
  console.log("The look at y is "+g_atY);
  console.log(g_theta);


  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_lookX, g_lookY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

       // SAVE world coord system;
    modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(1,1,1);				// shrink by 10X:

	drawGrid();


//===================Draw FIRST OBJECT:
  //-------Draw lower Spinning Cylinder:
    modelMatrix.scale(1/7,1/7,1/7);
	modelMatrix.translate(-0.6,0.6, 0.0);
	modelMatrix.scale(1.5, 1.5, 1.5);
	//modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01, 0,1,1);
	// Drawing:
  // Pass our current matrix to the vertex shaders:
    drawCylinder();


  //===========================================================
  //
	pushMatrix(modelMatrix);  // SAVE world drawing coords.

	modelMatrix.translate(0,0, 2.8);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(g_angle01, 0,0,1);
	drawSphere();

	pushMatrix(modelMatrix);

    modelMatrix.translate(-3,0, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(0,3, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(0,-3, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(-90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

			  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(3,0, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(-90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();


  modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
  modelMatrix.ortho(-5,5,
					-5,5  // FOVY: top-to-bottom vertical image angle, in degrees
					,-30,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        30);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_lookX, g_lookY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

       // SAVE world coord system;
    modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(1, 1, 1);				// shrink by 10X:

	//drawGrid();
	modelMatrix.scale(1/7,1/7,1/7);
	 modelMatrix.translate(0,30,3);
	modelMatrix.scale(2, 2, 2);
	modelMatrix.rotate(90, 0, 0, 1);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	modelMatrix.translate(0,0,2.5);
	modelMatrix.scale(0.5, 0.5, 0.5);
	modelMatrix.rotate(90, 0, 0, 1);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawSphere();

	modelMatrix.translate(-1.6,0,0);
	modelMatrix.scale(0.5, 0.5, 0.5);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder2();

	modelMatrix.translate(0,0,-2);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 0, 0, 1);
	modelMatrix.rotate(g_angle01, 0,0,1);
	drawSphere();

	pushMatrix(modelMatrix);  // SAVE world drawing coords.
	modelMatrix.translate(-7,0,0);
	modelMatrix.scale(3, 0.5, 0.5);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.

  	modelMatrix.translate(7,0,0);
	modelMatrix.scale(3, 0.5, 0.5);
	modelMatrix.rotate(-90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.

  	modelMatrix.translate(0,-7,0);
	modelMatrix.scale(0.5, 3, 0.5);
	modelMatrix.rotate(-90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

			modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.

	modelMatrix.translate(0,7,0);
	modelMatrix.scale(0.5, 3, 0.5);
	modelMatrix.rotate(90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

  modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
  modelMatrix.ortho(-5,5,
					-5,5  // FOVY: top-to-bottom vertical image angle, in degrees
					,-30,   // camera z-near distance (always positive; frustum begins at z = -znear)
                        30);  // camera z-far distance (always positive; frustum ends at z = -zfar)

  modelMatrix.lookAt( g_EyeX, g_EyeY, g_EyeZ,      // center of projection
                     g_lookX, g_lookY, g_lookZ,      // look-at point
                      0.0,  0.0,  1.0);     // 'up' vector

	modelMatrix.translate( 0.4, -0.4, 0.0);
  	modelMatrix.scale(1, 1, 1);				// shrink by 10X:

	//drawGrid();


//===================Draw Third OBJECT:
	modelMatrix.scale(1/7,1/7,1/7);

	modelMatrix.translate(30,0.6, 0.0);
	modelMatrix.scale(3, 3, 3);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(-120, 0, 0, 1);
	//modelMatrix.rotate(g_angle01, 0,1,1);
	// Drawing:
  // Pass our current matrix to the vertex shaders:
    drawCylinder2();


	pushMatrix(modelMatrix);  // SAVE world drawing coords.

	modelMatrix.translate(0,0, -1.8);
	modelMatrix.scale(0.8, 0.8, 0.4);
	//modelMatrix.rotate(, 0, 0, 1);
	//modelMatrix.rotate(g_angle01, 0,1,1);
	// Drawing:
  // Pass our current matrix to the vertex shaders:
    drawCylinder();

  //===========================================================
  //
	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
	//pushMatrix(modelMatrix);  // SAVE world drawing coords.

	modelMatrix.translate(-1.4,0, 0);
	modelMatrix.scale(2.5/6, 0.25, 0.25);
	modelMatrix.rotate(90, 0,1,0);
	modelMatrix.rotate(g_angle01, 0,0,1);
	drawSphere();

	pushMatrix(modelMatrix);

    modelMatrix.translate(-3,0, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

	  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(0,3, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		  	modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(0,-3, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(-90, 1, 0, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();

		modelMatrix = popMatrix();  // RESTORE 'world' drawing coords.
  //===========================================================
  //
  pushMatrix(modelMatrix);  // SAVE world drawing coords.
    modelMatrix.translate(3,0, 0);
	modelMatrix.scale(1, 1, 1);
	modelMatrix.rotate(-90, 0, 1, 0);
	//modelMatrix.rotate(g_angle01*0.8, 0,1,1);
	drawCylinder();




}

function drawCylinder(){
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
    gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							cylStart/floatsPerVertex, // start at this vertex number, and
  							cylVerts.length/floatsPerVertex);	// draw this many vertices.
}

function drawCylinder2(){
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  // Draw just the the cylinder's vertices:
    gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							cyl2Start/floatsPerVertex, // start at this vertex number, and
  							cylVerts2.length/floatsPerVertex);	// draw this many vertices.
}

function drawGrid(){

	 gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
     // Draw just the ground-plane's vertices
     gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
  						  gndStart/floatsPerVertex,	// start at this vertex number, and
  						  gndVerts.length/floatsPerVertex);	// draw this many vertices.

}

function drawTorus(){

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the torus's vertices
    gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  torStart/floatsPerVertex,	// start at this vertex number, and
  						  torVerts.length/floatsPerVertex);	// draw this many vertices.
}

function drawSphere(){

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the sphere's vertices
   gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							sphStart/floatsPerVertex,	// start at this vertex number, and
  							sphVerts.length/floatsPerVertex);	// draw this many vertices.
}

function drawAxes(){

	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the sphere's vertices
   gl.drawArrays(gl.LINES,				// use this drawing primitive, and
  							axeStart/floatsPerVertex,	// start at this vertex number, and
  							AxesVerts.length/floatsPerVertex);	// draw this many vertices.
}

function drawRectangle(){
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw just the sphere's vertices
   gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							recStart/floatsPerVertex,	// start at this vertex number, and
  							RecVerts.length/floatsPerVertex);	// draw this many vertices.
}


 //==================HTML Button Callbacks======================

function angleSubmit() {
// Called when user presses 'Submit' button on our webpage
//		HOW? Look in HTML file (e.g. ControlMulti.html) to find
//	the HTML 'input' element with id='usrAngle'.  Within that
//	element you'll find a 'button' element that calls this fcn.

// Read HTML edit-box contents:
	var UsrTxt = document.getElementById('usrAngle').value;
// Display what we read from the edit-box: use it to fill up
// the HTML 'div' element with id='editBoxOut':
  document.getElementById('EditBoxOut').innerHTML ='You Typed: '+UsrTxt;
  console.log('angleSubmit: UsrTxt:', UsrTxt); // print in console, and
  g_angle01 = parseFloat(UsrTxt);     // convert string to float number
  g_angle02 = parseFloat(UsrTxt);     // convert string to float number
};

function clearDrag() {
// Called when user presses 'Clear' button in our webpage
	g_xMdragTot = 0.0;
	g_yMdragTot = 0.0;
}

function spinUp() {
// Called when user presses the 'Spin >>' button on our webpage.
// ?HOW? Look in the HTML file (e.g. ControlMulti.html) to find
// the HTML 'button' element with onclick='spinUp()'.
  ANGLE_STEP += 25;
  ANGLE_STEP_2 -= 25;
}

function spinDown() {
// Called when user presses the 'Spin <<' button
 ANGLE_STEP -= 25;
 ANGLE_STEP_2 -= 25;

}

function runStop() {
// Called when user presses the 'Run/Stop' button
  if(ANGLE_STEP*ANGLE_STEP > 1 || ANGLE_STEP_2*ANGLE_STEP_2 > 1 ) {  // if nonzero rate,
    myTmp = ANGLE_STEP;  // store the current rate,
    ANGLE_STEP = 0;      // and set to zero.
	myTmp_2 = ANGLE_STEP_2;  // store the current rate,
    ANGLE_STEP_2 = 0;      // and set to zero.
  }
  else {    // but if rate is zero,
  	ANGLE_STEP = myTmp;  // use the stored rate.
	ANGLE_STEP_2 = myTmp_2;  // use the stored rate.
  }
}

  //===================Mouse and Keyboard event-handling Callbacks

  function myMouseDown(ev) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);

	g_isDrag = true;											// set our mouse-dragging flag
	g_xMclik = x;													// record where mouse-dragging began
	g_yMclik = y;
	// report on webpage
	document.getElementById('MouseAtResult').innerHTML =
	  'Mouse At: '+x.toFixed(5)+', '+y.toFixed(5);
};

  function myMouseMove(ev) {

//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position & how far we moved on webpage:
	document.getElementById('MouseAtResult').innerHTML =
	  'Mouse At: '+x.toFixed(5)+', '+y.toFixed(5);
	document.getElementById('MouseDragResult').innerHTML =
	  'Mouse Drag: '+(x - g_xMclik).toFixed(5)+', '+(y - g_yMclik).toFixed(5);

	g_xMclik = x;													// Make next drag-measurement from here.
	g_yMclik = y;
};

function myMouseUp(ev) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);

	g_isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	g_xMdragTot += (x - g_xMclik);
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position:
	document.getElementById('MouseAtResult').innerHTML =
	  'Mouse At: '+x.toFixed(5)+', '+y.toFixed(5);
	console.log('myMouseUp: g_xMdragTot,g_yMdragTot =',g_xMdragTot,',\t',g_yMdragTot);
};

function myMouseClick(ev) {



//=============================================================================
// Called when user completes a mouse-button single-click event
// (e.g. mouse-button pressed down, then released)
//
//    WHICH button? try:  console.log('ev.button='+ev.button);
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

  // STUB
	console.log("myMouseClick() on button: ", ev.button);
}

function myMouseDblClick(ev) {
//=============================================================================
// Called when user completes a mouse-button double-click event
//
//    WHICH button? try:  console.log('ev.button='+ev.button);
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

  // STUB
	console.log("myMouse-DOUBLE-Click() on button: ", ev.button);
}

function myKeyDown(kev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard;
//
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of a mess of JavaScript keyboard event handling,
// see:    http://javascript.info/tutorial/keyboard-events
//
// NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
//        'keydown' event deprecated several read-only properties I used
//        previously, including kev.charCode, kev.keyCode.
//        Revised 2/2019:  use kev.key and kev.code instead.
//
// Report EVERYTHING in console:
  console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key,
              "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
              "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);

// and report EVERYTHING on webpage:
	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
  document.getElementById('KeyModResult' ).innerHTML = '';
  // key details:
  document.getElementById('KeyModResult' ).innerHTML =
        "   --kev.code:"+kev.code   +"      --kev.key:"+kev.key+
    "<br>--kev.ctrlKey:"+kev.ctrlKey+" --kev.shiftKey:"+kev.shiftKey+
    "<br>--kev.altKey:"+kev.altKey +"  --kev.metaKey:"+kev.metaKey;

	switch(kev.code) {
		case "KeyP":
			console.log("Pause/unPause!\n");                // print on console,
			document.getElementById('KeyDownResult').innerHTML =
			'myKeyDown() found p/P key. Pause/unPause!';   // print on webpage
			if(g_isRun==true) {
			  g_isRun = false;    // STOP animation
			  }
			else {
			  g_isRun = true;     // RESTART animation
			  tick();
			  }
			break;
		//------------------WASD navigation-----------------
		case "KeyA":
			console.log("a/A key: Strafe LEFT!\n");
			document.getElementById('KeyDownResult').innerHTML =
			'myKeyDown() found a/A key. Strafe LEFT!';
			break;
    case "KeyD":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
			'myKeyDown() found d/D key. Strafe RIGHT!';
			break;
		case "KeyS":
			console.log("s/S key: Move BACK!\n");
			document.getElementById('KeyDownResult').innerHTML =
			'myKeyDown() found s/Sa key. Move BACK.';
			break;
		case "KeyW":
			console.log("w/W key: Move FWD!\n");
			document.getElementById('KeyDownResult').innerHTML =
			'myKeyDown() found w/W key. Move FWD!';
			break;
		//----------------Arrow keys------------------------
		case "ArrowLeft":
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown(): Left Arrow='+kev.keyCode;
			break;
		case "ArrowRight":
			console.log('right-arrow.');
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown():Right Arrow:keyCode='+kev.keyCode;
  		break;
		case "ArrowUp":
			console.log('   up-arrow.');
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown():   Up Arrow:keyCode='+kev.keyCode;
			break;
		case "ArrowDown":
			console.log(' down-arrow.');
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown(): Down Arrow:keyCode='+kev.keyCode;
  		break;
    default:
      console.log("UNUSED!");
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown(): UNUSED!';
      break;
	}
}


function keydown(ev) {
//------------------------------------------------------
//HTML calls this'Event handler' or 'callback function' when we press a key:

	var dx = g_EyeX - g_lookX;
	var dy = g_EyeY - g_lookY;
	var dz = g_EyeZ - g_lookZ;
	
    var abs_l = Math.sqrt(dx*dx + dy*dy + dz*dz);
    var abs_xy = Math.sqrt(dx*dx+dy*dy);



	if(ev.keyCode == 38) { // The up arrow key was pressed
//      g_EyeX += 0.01;
				//g_EyeX -= 0.1;
				g_lookZ+=0.1;

				// g_EyeZ -= 0.1;				// INCREASED for perspective camera)
    } else
	if (ev.keyCode == 40) { // The down arrow key was pressed
//      g_EyeX -= 0.01;

				g_lookZ -= 0.1;		// INCREASED for perspective camera)
    } else
    if(ev.keyCode == 39) { // The right arrow key was pressed
//      g_EyeX += 0.01;
				g_theta -= 5;		// INCREASED for perspective camera)
    } else
    if (ev.keyCode == 37) { // The left arrow key was pressed
//      g_EyeX -= 0.01;
				g_theta += 5;		// INCREASED for perspective camera)
    }

    else if(ev.keyCode == 87){ // w go forward

    	g_EyeX -= 0.1*(dx/abs_l);
    	g_EyeZ -= 0.1*(dz/abs_l);
    	g_EyeY-= 0.1*(dy/abs_l);

    	
    	g_lookX -= 0.1*(dx/abs_l);
    	g_lookZ -= 0.1*(dz/abs_l);
    	g_lookY-= 0.1*(dy/abs_l);

    }

    else if(ev.keyCode == 83){ // s go forward


    	g_EyeX += 0.1*(dx/abs_l);
    	g_EyeZ += 0.1*(dz/abs_l);
    	g_EyeY+= 0.1*(dy/abs_l);

    	
    	g_lookX += 0.1*(dx/abs_l);
    	g_lookZ += 0.1*(dz/abs_l);
    	g_lookY+= 0.1*(dy/abs_l);

    	

    }
    
    else if (ev.keyCode == 68){  //a
    		g_EyeX -= 0.1 * dy / abs_xy;
            g_EyeY += 0.1 * dx / abs_xy;
            g_lookX -= 0.1 * dy / abs_xy;
            g_lookY += 0.1 * dx / abs_xy;
    }


    else if (ev.keyCode == 65){  //d
    		g_EyeX +=  0.1 * dy / abs_xy;
            g_EyeY -=  0.1 * dx / abs_xy;
            g_lookX += 0.1 * dy /  abs_xy;
            g_lookY -= 0.1 * dx /  abs_xy;
}

    else { return; } // Prevent the unnecessary drawing


    drawAll();
}

function myKeyUp(kev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well

	console.log('myKeyUp()--keyCode='+kev.keyCode+' released.');
}
