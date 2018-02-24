const projectionMat = mat4.create();
const viewMat = mat4.create();

let vrDisplay = undefined;
let frameData = undefined;
let gl = undefined;
let cubeSea = undefined;
let stats = undefined;
let vrPresentButton = undefined;
let presentingMessage = undefined;
let webglCanvas = undefined;

const initWebGL = () => {
    const glAttribs = {alpha: false};
    gl = webglCanvas.getContext(`webgl`, glAttribs);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const textureLoader = new WGLUTextureLoader(gl);
    const texture = textureLoader.loadTexture(`media/textures/cube-sea.png`);
    cubeSea = new VRCubeSea(gl, texture);

    stats = new WGLUStats(gl, false);

    // Wait until we have a WebGL context to resize and start rendering.
    window.addEventListener(`resize`, onResize, false);
    onResize();
};

const onResize = () => {
    if (vrDisplay && vrDisplay.isPresenting) {
        const leftEye = vrDisplay.getEyeParameters(`left`);
        const rightEye = vrDisplay.getEyeParameters(`right`);
        webglCanvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
        webglCanvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
    } else {
        webglCanvas.width = webglCanvas.offsetWidth * window.devicePixelRatio;
        webglCanvas.height = webglCanvas.offsetHeight * window.devicePixelRatio;
    }
};

const onContextRestored = () => {
    console.log(`WebGL Context Restored.`);
    initWebGL();
};

const onContextLost = (ev) => {
    ev.preventDefault();
    console.log(`WebGL Context Lost.`);
    gl = undefined;
    cubeSea = undefined;
    stats = undefined;
};

const onVRRequestPresent = () => {
    vrDisplay.requestPresent([{source: webglCanvas}]);
};

const onVRPresentChange = () => {
    onResize();

    if (vrDisplay.isPresenting) {
        if (vrDisplay.capabilities.hasExternalDisplay) {
            presentingMessage.style.display = `block`;
            VRSamplesUtil.removeButton(vrPresentButton);
            vrPresentButton = VRSamplesUtil.addButton(`Exit VR`, `E`, `media/icons/cardboard64.png`, onVRExitPresent);
        }
    } else {
        if (vrDisplay.capabilities.hasExternalDisplay) {
            presentingMessage.style.display = "";
            VRSamplesUtil.removeButton(vrPresentButton);
            vrPresentButton = VRSamplesUtil.addButton(`Enter VR`, `E`, `media/icons/cardboard64.png`, onVRRequestPresent);
        }
    }
};

const onVRExitPresent = () => {
    if (!vrDisplay.isPresenting)
        return;
    vrDisplay.exitPresent();
};

const onAnimationFrame = (t) => {
    if (!gl || !stats || !cubeSea) {
        return;
    }
    stats.begin();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (vrDisplay) {
        vrDisplay.requestAnimationFrame(onAnimationFrame);
        vrDisplay.getFrameData(frameData);

        if (vrDisplay.isPresenting) {
            gl.viewport(0, 0, webglCanvas.width * 0.5, webglCanvas.height);
            cubeSea.render(frameData.leftProjectionMatrix, frameData.leftViewMatrix, stats, t);

            gl.viewport(webglCanvas.width * 0.5, 0, webglCanvas.width * 0.5, webglCanvas.height);
            cubeSea.render(frameData.rightProjectionMatrix, frameData.rightViewMatrix, stats, t);

            vrDisplay.submitFrame();
        } else {
            gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
            mat4.perspective(projectionMat, Math.PI * 0.4, webglCanvas.width / webglCanvas.height, 0.1, 1024.0);
            cubeSea.render(projectionMat, frameData.leftViewMatrix, stats, t);
            stats.renderOrtho();
        }
    } else {
        window.requestAnimationFrame(onAnimationFrame);
        gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
        mat4.perspective(projectionMat, Math.PI * 0.4, webglCanvas.width / webglCanvas.height, 0.1, 1024.0);
        mat4.identity(viewMat);
        cubeSea.render(projectionMat, viewMat, stats, t);
        stats.renderOrtho();
    }
    stats.end();
};

window.onload = () => {
    presentingMessage = document.getElementById("presenting-message");
    webglCanvas = document.getElementById("webgl-canvas");
    webglCanvas.addEventListener('webglcontextlost', onContextLost, false);
    webglCanvas.addEventListener('webglcontextrestored', onContextRestored, false);

    initWebGL();

    frameData = new VRFrameData();

    navigator.getVRDisplays().then((displays) => {
        vrDisplay = displays[displays.length - 1];
        vrDisplay.depthNear = 0.1;
        vrDisplay.depthFar = 1024.0;
        if (vrDisplay.capabilities.canPresent) {
            vrPresentButton = VRSamplesUtil.addButton(`Enter VR`, `E`, `media/icons/cardboard64.png`, onVRRequestPresent);
        }
        window.addEventListener(`vrdisplaypresentchange`, onVRPresentChange, false);
        window.addEventListener('vrdisplayactivate', onVRRequestPresent, false);
        window.addEventListener('vrdisplaydeactivate', onVRExitPresent, false);
    });

    window.requestAnimationFrame(onAnimationFrame);
};

