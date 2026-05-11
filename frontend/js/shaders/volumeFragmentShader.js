const volumeFragmentShader = `
precision highp float;
precision highp sampler3D;

in vec3 vWorldPosition;
in vec3 vLocalPosition;

uniform sampler3D volumeTexture;
uniform vec3 cameraPos;
uniform vec3 lightDir;
uniform float stepSize;
uniform int maxSteps;
uniform float skinThreshold;
uniform float boneThreshold;
uniform vec3 volumeCenter;
uniform float volumeScale;

out vec4 outColor;

float sampleVolume(vec3 pos) {
    vec3 uvw = (pos - volumeCenter) / volumeScale + 0.5;
    if (uvw.x < 0.0 || uvw.x > 1.0 || uvw.y < 0.0 || uvw.y > 1.0 || uvw.z < 0.0 || uvw.z > 1.0) {
        return 0.0;
    }
    return textureLod(volumeTexture, uvw, 0.0).r;
}

vec3 getGradient(vec3 pos) {
    float delta = stepSize;
    return normalize(vec3(
        sampleVolume(pos + vec3(delta, 0.0, 0.0)) - sampleVolume(pos - vec3(delta, 0.0, 0.0)),
        sampleVolume(pos + vec3(0.0, delta, 0.0)) - sampleVolume(pos - vec3(0.0, delta, 0.0)),
        sampleVolume(pos + vec3(0.0, 0.0, delta)) - sampleVolume(pos - vec3(0.0, 0.0, delta))
    ));
}

vec4 transferFunction(float density) {
    vec4 color = vec4(0.0);
    
    if (density > boneThreshold) {
        color = vec4(0.95, 0.9, 0.8, 0.95);
    }
    else if (density > skinThreshold) {
        color = vec4(0.9, 0.75, 0.7, 0.4);
    }
    else if (density > 0.1) {
        color = vec4(0.8, 0.85, 0.9, 0.15);
    }
    
    return color;
}

float getOpacity(float density) {
    if (density > boneThreshold) {
        return 0.08;
    }
    else if (density > skinThreshold) {
        return 0.03;
    }
    else if (density > 0.1) {
        return 0.008;
    }
    return 0.0;
}

vec3 computeLighting(vec3 normal, vec3 viewDir, vec3 color) {
    vec3 ambient = color * 0.3;
    
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = color * diff * 0.5;
    
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    vec3 specular = vec3(0.3) * spec;
    
    return ambient + diffuse + specular;
}

void main() {
    vec3 rayOrigin = cameraPos;
    vec3 rayDir = normalize(vWorldPosition - cameraPos);
    
    vec3 boxMin = volumeCenter - volumeScale * 0.5;
    vec3 boxMax = volumeCenter + volumeScale * 0.5;
    
    vec3 invDir = 1.0 / rayDir;
    vec3 tMin = (boxMin - rayOrigin) * invDir;
    vec3 tMax = (boxMax - rayOrigin) * invDir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    
    if (tNear >= tFar) {
        discard;
    }
    
    tNear = max(tNear, 0.0);
    
    vec3 startPos = rayOrigin + rayDir * tNear;
    float dist = tFar - tNear;
    
    vec4 finalColor = vec4(0.0);
    float currentDist = 0.0;
    int steps = 0;
    
    while (currentDist < dist && steps < maxSteps && finalColor.a < 0.95) {
        vec3 samplePos = startPos + rayDir * currentDist;
        float density = sampleVolume(samplePos);
        
        if (density > 0.01) {
            vec4 tfColor = transferFunction(density);
            float opacity = getOpacity(density);
            
            if (opacity > 0.0) {
                vec3 normal = getGradient(samplePos);
                vec3 viewDir = -rayDir;
                vec3 litColor = computeLighting(normal, viewDir, tfColor.rgb);
                
                float alpha = opacity * (1.0 - finalColor.a);
                finalColor.rgb += litColor * alpha;
                finalColor.a += alpha;
            }
        }
        
        currentDist += stepSize;
        steps++;
    }
    
    if (finalColor.a < 0.01) {
        discard;
    }
    
    outColor = vec4(finalColor.rgb, finalColor.a);
}
`;

export { volumeFragmentShader };
