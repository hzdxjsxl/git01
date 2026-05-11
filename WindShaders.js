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
        uniform vec4 u_lonLatBounds;
        uniform float u_lonRange;
        uniform float u_latRange;
        
        varying vec2 vUv;
        
        vec2 sampleWind(vec2 uv) {
            vec4 windData = texture2D(u_windTexture, uv);
            return windData.xy;
        }
        
        vec2 bilinearSampleWind(vec2 uv) {
            vec2 texelSize = 1.0 / u_windTextureSize;
            vec2 halfTexel = 0.5 / u_windTextureSize;
            
            uv = clamp(uv, halfTexel, 1.0 - halfTexel);
            
            vec2 texCoords = uv * u_windTextureSize;
            vec2 iTexCoords = floor(texCoords);
            vec2 fTexCoords = fract(texCoords);
            
            vec2 uv00 = iTexCoords / u_windTextureSize;
            vec2 uv11 = (iTexCoords + vec2(1.0)) / u_windTextureSize;
            vec2 uv01 = vec2(uv00.x, uv11.y);
            vec2 uv10 = vec2(uv11.x, uv00.y);
            
            vec2 w00 = sampleWind(uv00 + halfTexel);
            vec2 w10 = sampleWind(uv10 + halfTexel);
            vec2 w01 = sampleWind(uv01 + halfTexel);
            vec2 w11 = sampleWind(uv11 + halfTexel);
            
            vec2 w0 = mix(w00, w10, fTexCoords.x);
            vec2 w1 = mix(w01, w11, fTexCoords.x);
            return mix(w0, w1, fTexCoords.y);
        }
        
        vec2 globalUVToWindUV(vec2 globalUV) {
            vec2 lonLat;
            lonLat.x = globalUV.x * 360.0 - 180.0;
            lonLat.y = globalUV.y * 180.0 - 90.0;
            
            vec2 windUV;
            windUV.x = (lonLat.x - u_lonLatBounds.x) / u_lonRange;
            windUV.y = 1.0 - (lonLat.y - u_lonLatBounds.z) / u_latRange;
            
            return windUV;
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
            
            vec2 windUV = globalUVToWindUV(pos);
            vec2 wind = bilinearSampleWind(windUV);
            
            vec2 velocity = wind * u_speed * u_deltaTime;
            velocity.x = velocity.x / 360.0;
            velocity.y = velocity.y / 180.0;
            
            pos += velocity;
            
            pos.x = fract(pos.x + 1.0);
            pos.y = clamp(pos.y, 0.0, 1.0);
            
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
        uniform vec4 u_lonLatBounds;
        uniform float u_lonRange;
        uniform float u_latRange;
        
        attribute vec2 a_uv;
        
        varying float v_age;
        varying float v_maxAge;
        varying float v_windStrength;
        varying vec2 v_wind;
        varying float v_life;
        
        vec3 globalUVToWorld(vec2 uv, float radius) {
            float lon = radians(uv.x * 360.0 - 180.0);
            float lat = radians(uv.y * 180.0 - 90.0);
            
            float particleRadius = radius * 1.002;
            float x = particleRadius * cos(lat) * cos(lon);
            float y = particleRadius * sin(lat);
            float z = particleRadius * cos(lat) * sin(lon);
            
            return vec3(x, y, z);
        }
        
        vec2 globalUVToWindUV(vec2 globalUV) {
            vec2 lonLat;
            lonLat.x = globalUV.x * 360.0 - 180.0;
            lonLat.y = globalUV.y * 180.0 - 90.0;
            
            vec2 windUV;
            windUV.x = (lonLat.x - u_lonLatBounds.x) / u_lonRange;
            windUV.y = 1.0 - (lonLat.y - u_lonLatBounds.z) / u_latRange;
            
            return windUV;
        }
        
        vec2 bilinearSampleWind(vec2 uv, sampler2D tex, vec2 texSize) {
            vec2 texelSize = 1.0 / texSize;
            vec2 halfTexel = 0.5 / texSize;
            
            uv = clamp(uv, halfTexel, 1.0 - halfTexel);
            
            vec2 texCoords = uv * texSize;
            vec2 iTexCoords = floor(texCoords);
            vec2 fTexCoords = fract(texCoords);
            
            vec2 uv00 = iTexCoords / texSize;
            vec2 uv11 = (iTexCoords + vec2(1.0)) / texSize;
            vec2 uv01 = vec2(uv00.x, uv11.y);
            vec2 uv10 = vec2(uv11.x, uv00.y);
            
            vec2 w00 = texture2D(tex, uv00 + halfTexel).xy;
            vec2 w10 = texture2D(tex, uv10 + halfTexel).xy;
            vec2 w01 = texture2D(tex, uv01 + halfTexel).xy;
            vec2 w11 = texture2D(tex, uv11 + halfTexel).xy;
            
            vec2 w0 = mix(w00, w10, fTexCoords.x);
            vec2 w1 = mix(w01, w11, fTexCoords.x);
            return mix(w0, w1, fTexCoords.y);
        }
        
        void main() {
            vec4 posData = texture2D(u_positionTexture, a_uv);
            vec2 globalUV = posData.xy;
            v_age = posData.z;
            v_maxAge = posData.w;
            v_life = v_age / v_maxAge;
            
            vec2 windUV = globalUVToWindUV(globalUV);
            v_wind = bilinearSampleWind(windUV, u_windTexture, u_windTextureSize);
            v_windStrength = length(v_wind);
            
            vec3 worldPos = globalUVToWorld(globalUV, u_radius);
            worldPos = (u_rotationMatrix * vec4(worldPos, 1.0)).xyz;
            
            float ageFactor = 1.0;
            if (v_life < u_fadeStart) {
                ageFactor = v_life / u_fadeStart;
            } else if (v_life > u_fadeEnd) {
                ageFactor = (1.0 - v_life) / (1.0 - u_fadeEnd);
            }
            
            float sizeMultiplier = 1.0 + v_windStrength * 0.02;
            
            vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = u_particleSize * sizeMultiplier * ageFactor;
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
            if (v_life < 0.05) {
                lifeAlpha = v_life / 0.05;
            } else if (v_life > 0.95) {
                lifeAlpha = (1.0 - v_life) / 0.05;
            }
            
            gl_FragColor = vec4(color, alpha * lifeAlpha * 0.95);
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
