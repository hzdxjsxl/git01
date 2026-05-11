const volumeVertexShader = `
out vec3 vWorldPosition;
out vec3 vLocalPosition;

void main() {
    vLocalPosition = position;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export { volumeVertexShader };
