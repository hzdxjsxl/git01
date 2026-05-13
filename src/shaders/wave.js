export const waveSimulationShader = `
precision highp float;

varying vec2 v_texCoord;

uniform sampler2D u_currentHeight;
uniform sampler2D u_previousHeight;
uniform vec2 u_resolution;
uniform float u_damping;
uniform float u_waveSpeed;
uniform vec2 u_dropPosition;
uniform float u_dropRadius;
uniform float u_dropStrength;
uniform float u_hasDrop;

const float BASE = 0.5;

void main() {
    vec2 texel = 1.0 / u_resolution;
    
    vec4 current = texture2D(u_currentHeight, v_texCoord);
    vec4 previous = texture2D(u_previousHeight, v_texCoord);
    
    vec4 left = texture2D(u_currentHeight, v_texCoord + vec2(-texel.x, 0.0));
    vec4 right = texture2D(u_currentHeight, v_texCoord + vec2(texel.x, 0.0));
    vec4 up = texture2D(u_currentHeight, v_texCoord + vec2(0.0, texel.y));
    vec4 down = texture2D(u_currentHeight, v_texCoord + vec2(0.0, -texel.y));
    
    float currentHeight = current.r - BASE;
    float prevHeight = previous.r - BASE;
    float leftHeight = left.r - BASE;
    float rightHeight = right.r - BASE;
    float upHeight = up.r - BASE;
    float downHeight = down.r - BASE;
    
    float laplacian = (leftHeight + rightHeight + upHeight + downHeight - 4.0 * currentHeight) * u_waveSpeed;
    float newHeight = 2.0 * currentHeight - prevHeight + laplacian;
    newHeight *= u_damping;
    
    if (u_hasDrop > 0.5) {
        vec2 pos = v_texCoord - u_dropPosition;
        float dist = length(pos);
        float drop = smoothstep(u_dropRadius, 0.0, dist) * u_dropStrength;
        newHeight += drop;
    }
    
    newHeight = clamp(newHeight, -0.45, 0.45);
    float outputHeight = newHeight + BASE;
    
    gl_FragColor = vec4(outputHeight, outputHeight, outputHeight, 1.0);
}
`;

export const waterRenderShader = `
precision highp float;

varying vec2 v_texCoord;

uniform sampler2D u_heightMap;
uniform vec2 u_resolution;
uniform float u_time;

const float BASE = 0.5;

void main() {
    vec2 texel = 1.0 / u_resolution;
    
    vec4 center = texture2D(u_heightMap, v_texCoord);
    vec4 left = texture2D(u_heightMap, v_texCoord + vec2(-texel.x, 0.0));
    vec4 right = texture2D(u_heightMap, v_texCoord + vec2(texel.x, 0.0));
    vec4 up = texture2D(u_heightMap, v_texCoord + vec2(0.0, texel.y));
    vec4 down = texture2D(u_heightMap, v_texCoord + vec2(0.0, -texel.y));
    
    float centerH = center.r - BASE;
    float leftH = left.r - BASE;
    float rightH = right.r - BASE;
    float upH = up.r - BASE;
    float downH = down.r - BASE;
    
    float dx = (rightH - leftH) * 0.5;
    float dy = (upH - downH) * 0.5;
    
    vec3 normal = normalize(vec3(dx * 20.0, dy * 20.0, 1.0));
    
    vec3 lightDir = normalize(vec3(0.5, 0.7, 1.0));
    float diffuse = max(dot(normal, lightDir), 0.0);
    
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);
    
    vec3 baseColor = vec3(0.0, 0.3, 0.5);
    vec3 highlightColor = vec3(0.3, 0.7, 1.0);
    vec3 color = mix(baseColor, highlightColor, diffuse * 0.8);
    
    color += specular * vec3(0.8, 0.9, 1.0);
    color += centerH * 0.5;
    
    float edgeDarkness = 1.0 - length(v_texCoord - 0.5) * 0.5;
    color *= edgeDarkness;
    
    gl_FragColor = vec4(color, 1.0);
}
`;
