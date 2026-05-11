export const WindShaders = {

    advectionComputeVertex: `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    advectionComputeFragment: `
        uniform sampler2D u_positionTexture;
        uniform sampler2D u_windTexture;
        uniform float u_time;
        uniform float u_deltaTime;
        uniform float u_speed;
        uniform vec2 u_windTextureSize;
        uniform float u_resetProbability;
        
        varying vec2 vUv;
        
        vec2 sampleWind(vec2 uv) {
            vec4 windData = texture2D(u_windTexture, uv);
            return windData.xy;
        }
        
        vec2 bilinearSampleWind(vec2 uv) {
            vec2 texelSize = 1.0 / u_windTextureSize;
            
            vec2 uv00 = floor(uv * u_windTextureSize) / u_windTextureSize;
            vec2 uv11 = uv00 + texelSize;
            vec2 uv01 = vec2(uv00.x, uv11.y);
            vec2 uv10 = vec2(uv11.x, uv00.y);
            
            vec2 f = fract(uv * u_windTextureSize);
            
            vec2 w00 = sampleWind(uv00);
            vec2 w10 = sampleWind(uv10);
            vec2 w01 = sampleWind(uv01);
            vec2 w11 = sampleWind(uv11);
            
            vec2 w0 = mix(w00, w10, f.x);
            vec2 w1 = mix(w01, w11, f.x);
            return mix(w0, w1, f.y);
        }
        
        float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
            vec4 currentPos = texture2D(u_positionTexture, vUv);
            vec2 pos = currentPos.xy;
            float age = currentPos.z;
            float maxAge = currentPos.w;
            
            if (rand(pos + u_time) < u_resetProbability || age >= maxAge) {
                float randomX = rand(vUv + vec2(u_time, 0.0));
                float randomY = rand(vUv + vec2(0.0, u_time));
                pos = vec2(randomX, randomY);
                age = 0.0;
                maxAge = 50.0 + rand(vUv) * 100.0;
            }
            
            vec2 wind = bilinearSampleWind(pos);
            
            float lonRange = 360.0;
            float latRange = 180.0;
            
            vec2 velocity = wind * u_speed * u_deltaTime;
            velocity.x = velocity.x / lonRange;
            velocity.y = velocity.y / latRange;
            
            pos += velocity;
            
            pos.x = fract(pos.x);
            
            if (pos.y < 0.0) {
                pos.y = 0.0;
                velocity.y *= -0.5;
            }
            if (pos.y > 1.0) {
                pos.y = 1.0;
                velocity.y *= -0.5;
            }
            
            age += u_deltaTime;
            
            gl_FragColor = vec4(pos, age, maxAge);
        }
    `,

    particleVertex: `
        uniform sampler2D u_positionTexture;
        uniform sampler2D u_windTexture;
        uniform float u_time;
        uniform float u_particleSize;
        uniform mat4 u_rotationMatrix;
        uniform float u_fadeStart;
        uniform float u_fadeEnd;
        uniform float u_radius;
        uniform vec2 u_windTextureSize;
        
        attribute vec2 a_uv;
        
        varying float v_age;
        varying float v_maxAge;
        varying float v_windStrength;
        varying vec2 v_wind;
        varying float v_life;
        
        vec3 lonLatToWorld(vec2 lonLat, float radius) {
            float lon = radians(lonLat.x * 360.0 - 180.0);
            float lat = radians(lonLat.y * 180.0 - 90.0);
            
            float x = radius * cos(lat) * cos(lon);
            float y = radius * sin(lat);
            float z = radius * cos(lat) * sin(lon);
            
            return vec3(x, y, z);
        }
        
        vec2 bilinearSampleWind(vec2 uv, sampler2D tex, vec2 texSize) {
            vec2 texelSize = 1.0 / texSize;
            
            vec2 uv00 = floor(uv * texSize) / texSize;
            vec2 uv11 = uv00 + texelSize;
            vec2 uv01 = vec2(uv00.x, uv11.y);
            vec2 uv10 = vec2(uv11.x, uv00.y);
            
            vec2 f = fract(uv * texSize);
            
            vec2 w00 = texture2D(tex, uv00).xy;
            vec2 w10 = texture2D(tex, uv10).xy;
            vec2 w01 = texture2D(tex, uv01).xy;
            vec2 w11 = texture2D(tex, uv11).xy;
            
            vec2 w0 = mix(w00, w10, f.x);
            vec2 w1 = mix(w01, w11, f.x);
            return mix(w0, w1, f.y);
        }
        
        void main() {
            vec4 posData = texture2D(u_positionTexture, a_uv);
            vec2 lonLat = posData.xy;
            v_age = posData.z;
            v_maxAge = posData.w;
            v_life = v_age / v_maxAge;
            
            v_wind = bilinearSampleWind(lonLat, u_windTexture, u_windTextureSize);
            v_windStrength = length(v_wind);
            
            vec3 worldPos = lonLatToWorld(lonLat, u_radius);
            worldPos = (u_rotationMatrix * vec4(worldPos, 1.0)).xyz;
            
            float ageFactor = 1.0;
            if (v_life < u_fadeStart) {
                ageFactor = v_life / u_fadeStart;
            } else if (v_life > u_fadeEnd) {
                ageFactor = (1.0 - v_life) / (1.0 - u_fadeEnd);
            }
            
            float sizeMultiplier = 1.0 + v_windStrength * 0.05;
            
            vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = u_particleSize * sizeMultiplier * ageFactor;
            gl_PointSize *= (1.0 / -mvPosition.z);
        }
    `,

    particleFragment: `
        uniform float u_time;
        uniform vec3 u_colorHigh;
        uniform vec3 u_colorLow;
        uniform float u_maxWindSpeed;
        
        varying float v_age;
        varying float v_maxAge;
        varying float v_windStrength;
        varying vec2 v_wind;
        varying float v_life;
        
        void main() {
            float strength = clamp(v_windStrength / u_maxWindSpeed, 0.0, 1.0);
            
            vec3 color = mix(u_colorLow, u_colorHigh, strength);
            
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            if (dist > 0.5) {
                discard;
            }
            
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            
            float lifeAlpha = 1.0;
            if (v_life < 0.15) {
                lifeAlpha = v_life / 0.15;
            } else if (v_life > 0.85) {
                lifeAlpha = (1.0 - v_life) / 0.15;
            }
            
            gl_FragColor = vec4(color, alpha * lifeAlpha * 0.9);
        }
    `,

    initializePositionVertex: `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    initializePositionFragment: `
        uniform float u_time;
        
        varying vec2 vUv;
        
        float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
            float randomX = rand(vUv + vec2(u_time, 0.0));
            float randomY = rand(vUv + vec2(0.0, u_time));
            float age = rand(vUv * 100.0) * 50.0;
            float maxAge = 50.0 + rand(vUv) * 100.0;
            
            gl_FragColor = vec4(randomX, randomY, age, maxAge);
        }
    `
};
