export class WebGLWrapper {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.programs = {};
        this.buffers = {};
        this.textures = {};
        this.framebuffers = {};
        
        this.init();
    }
    
    init() {
        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) {
            throw new Error('WebGL 不支持');
        }
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`着色器编译失败: ${info}`);
        }
        
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`程序链接失败: ${info}`);
        }
        
        return program;
    }
    
    createBuffer(type, data, usage) {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(type, buffer);
        if (data) {
            gl.bufferData(type, data, usage || gl.STATIC_DRAW);
        }
        return buffer;
    }
    
    createTexture(width, height, data) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        return texture;
    }
    
    createFramebuffer(texture) {
        const gl = this.gl;
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        );
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Framebuffer 创建失败');
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return framebuffer;
    }
    
    useProgram(program) {
        this.gl.useProgram(program);
    }
    
    getAttribLocation(program, name) {
        return this.gl.getAttribLocation(program, name);
    }
    
    getUniformLocation(program, name) {
        return this.gl.getUniformLocation(program, name);
    }
    
    setUniform1f(program, name, value) {
        const location = this.getUniformLocation(program, name);
        if (location !== -1) {
            this.gl.uniform1f(location, value);
        }
    }
    
    setUniform2f(program, name, x, y) {
        const location = this.getUniformLocation(program, name);
        if (location !== -1) {
            this.gl.uniform2f(location, x, y);
        }
    }
    
    setUniform1i(program, name, value) {
        const location = this.getUniformLocation(program, name);
        if (location !== -1) {
            this.gl.uniform1i(location, value);
        }
    }
    
    viewport(width, height) {
        this.gl.viewport(0, 0, width, height);
    }
    
    clear(r = 0, g = 0, b = 0, a = 1) {
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    
    bindFramebuffer(framebuffer, width, height) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        if (framebuffer) {
            gl.viewport(0, 0, width, height);
        } else {
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    drawArrays(mode, first, count) {
        this.gl.drawArrays(mode, first, count);
    }
}
