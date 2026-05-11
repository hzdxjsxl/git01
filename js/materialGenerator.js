class MaterialGenerator {
    constructor(scene) {
        this.scene = scene;
        this._materialCache = new Map();
    }

    hexToColor3(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        return new BABYLON.Color3(r, g, b);
    }

    createPBRMaterial(config) {
        const {
            color = '#c0c0c0',
            roughness = 0.2,
            metallic = 1.0,
            name = 'customPBRMaterial',
            environmentTexture = null,
            environmentIntensity = 1.5,
            emissiveColor = null,
            emissiveIntensity = 0,
            useMicroSurface = true,
            directIntensity = 1.0,
            useLogarithmicDepth = false
        } = config;

        const cacheKey = `${color}_${roughness}_${metallic}`;
        
        if (this._materialCache.has(cacheKey)) {
            return this._materialCache.get(cacheKey);
        }

        const material = new BABYLON.PBRMetallicRoughnessMaterial(name, this.scene);
        
        material.baseColor = this.hexToColor3(color);
        material.roughness = roughness;
        material.metallic = metallic;
        
        material.directIntensity = directIntensity;
        material.environmentIntensity = environmentIntensity;
        
        if (environmentTexture) {
            material.environmentTexture = environmentTexture;
        }
        
        if (useMicroSurface) {
            material.useMicroSurfaceFromReflectivityMapAlpha = false;
            material.useRoughnessFromMetallicTextureAlpha = true;
            material.useMetallnessFromMetallicTextureBlue = false;
        }
        
        if (emissiveColor) {
            material.emissiveColor = this.hexToColor3(emissiveColor);
            material.emissiveIntensity = emissiveIntensity;
        }
        
        if (useLogarithmicDepth) {
            material.backFaceCulling = false;
        }
        
        material.twoSidedLighting = true;
        
        this._materialCache.set(cacheKey, material);
        
        return material;
    }

    createStandardPBRMaterial(config) {
        const {
            color = '#c0c0c0',
            roughness = 0.2,
            metallic = 1.0,
            name = 'standardPBRMaterial',
            environmentTexture = null,
            environmentIntensity = 1.5,
            indexOfRefraction = 1.5,
            metallicFallback = 0.04
        } = config;

        const material = new BABYLON.PBRMaterial(name, this.scene);
        
        material.albedoColor = this.hexToColor3(color);
        material.metallic = metallic;
        material.roughness = roughness;
        
        material.environmentIntensity = environmentIntensity;
        
        if (environmentTexture) {
            material.reflectionTexture = environmentTexture;
        }
        
        material.indexOfRefraction = indexOfRefraction;
        material.metallicF0Factor = metallicFallback;
        
        material.usePhysicalLightFalloff = true;
        material.useRadianceOverAlpha = false;
        material.useGlossinessFromSpecularMapAlpha = false;
        material.useSpecularOverAlpha = true;
        material.useAutoMicroSurfaceFromReflectivityMap = true;
        
        material.specularIntensity = 1.0;
        
        return material;
    }

    updateMaterialProperties(material, config) {
        if (config.color !== undefined && material.baseColor !== undefined) {
            material.baseColor = this.hexToColor3(config.color);
        }
        if (config.color !== undefined && material.albedoColor !== undefined) {
            material.albedoColor = this.hexToColor3(config.color);
        }
        
        if (config.roughness !== undefined) {
            material.roughness = config.roughness;
        }
        
        if (config.metallic !== undefined) {
            if (material.metallic !== undefined) {
                material.metallic = config.metallic;
            }
        }
        
        if (config.environmentIntensity !== undefined) {
            material.environmentIntensity = config.environmentIntensity;
        }
        
        if (config.environmentTexture !== undefined) {
            if (material.environmentTexture !== undefined) {
                material.environmentTexture = config.environmentTexture;
            }
            if (material.reflectionTexture !== undefined) {
                material.reflectionTexture = config.environmentTexture;
            }
        }
    }

    createPresetMaterial(presetName, presets, environmentTexture = null) {
        const preset = presets[presetName];
        if (!preset) {
            console.warn(`Preset '${presetName}' not found`);
            return null;
        }
        
        return this.createPBRMaterial({
            ...preset,
            environmentTexture,
            name: `preset_${presetName}`
        });
    }

    clearCache() {
        this._materialCache.clear();
    }

    dispose() {
        this._materialCache.forEach((material) => {
            material.dispose();
        });
        this._materialCache.clear();
    }
}

if (typeof window !== 'undefined') {
    window.MaterialGenerator = MaterialGenerator;
}
