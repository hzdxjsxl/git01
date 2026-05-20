class ModelFactory {
  static createShelf(data) {
    const group = new THREE.Group();
    
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.6,
      roughness: 0.4
    });

    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      metalness: 0.3,
      roughness: 0.7
    });

    const legGeometry = new THREE.BoxGeometry(0.1, data.height, 0.1);
    const legPositions = [
      [-data.width / 2 + 0.05, data.height / 2, -data.depth / 2 + 0.05],
      [data.width / 2 - 0.05, data.height / 2, -data.depth / 2 + 0.05],
      [-data.width / 2 + 0.05, data.height / 2, data.depth / 2 - 0.05],
      [data.width / 2 - 0.05, data.height / 2, data.depth / 2 - 0.05]
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, frameMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    const shelfCount = Math.floor(data.height / 1.2);
    const shelfGeometry = new THREE.BoxGeometry(data.width, 0.08, data.depth);
    
    for (let i = 0; i < shelfCount; i++) {
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.y = 0.5 + i * 1.2;
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
    }

    const goodsColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181, 0xaa96da];
    for (let i = 0; i < shelfCount; i++) {
      const goodsCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < goodsCount; j++) {
        const boxSize = 0.2 + Math.random() * 0.3;
        const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const boxMaterial = new THREE.MeshStandardMaterial({
          color: goodsColors[Math.floor(Math.random() * goodsColors.length)],
          metalness: 0.2,
          roughness: 0.8
        });
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.set(
          (Math.random() - 0.5) * (data.width - 0.4),
          0.5 + i * 1.2 + boxSize / 2 + 0.05,
          (Math.random() - 0.5) * (data.depth - 0.4)
        );
        box.castShadow = true;
        group.add(box);
      }
    }

    group.position.set(data.x, 0, data.z);
    group.userData = { type: 'shelf', data: data };
    
    return group;
  }

  static createRobot(data) {
    const group = new THREE.Group();
    
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      metalness: 0.7,
      roughness: 0.3,
      emissive: new THREE.Color(data.color),
      emissiveIntensity: 0.2
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2
    });

    const bodyGeometry = new THREE.BoxGeometry(0.7, 0.5, 0.9);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    const topGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
    const top = new THREE.Mesh(topGeometry, accentMaterial);
    top.position.y = 0.75;
    top.castShadow = true;
    group.add(top);

    const lightGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color)
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(0, 0.95, 0);
    group.add(light);

    const wheelGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.5,
      roughness: 0.5
    });
    const wheelPositions = [
      [-0.3, 0.12, 0.35],
      [0.3, 0.12, 0.35],
      [-0.3, 0.12, -0.35],
      [0.3, 0.12, -0.35]
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      group.add(wheel);
    });

    const sensorGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
    sensor.position.set(0, 0.5, 0.46);
    group.add(sensor);

    group.position.set(data.x, 0, data.z);
    group.userData = { 
      type: 'robot', 
      data: data,
      wheels: group.children.filter((_, i) => i >= 4 && i <= 7),
      light: light,
      sensor: sensor
    };
    
    return group;
  }

  static createPathLine(points, color = 0x00d4ff) {
    const geometry = new THREE.BufferGeometry();
    const vertices = points.map(p => new THREE.Vector3(p.x, 0.1, p.z));
    geometry.setFromPoints(vertices);

    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geometry, material);
    line.userData = { type: 'path' };
    return line;
  }

  static createTargetMarker(x, z, color = 0xffff00) {
    const group = new THREE.Group();

    const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    const pillarGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const pillarMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5
    });
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.y = 1;
    group.add(pillar);

    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: color
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 2.1;
    group.add(sphere);

    group.position.set(x, 0, z);
    group.userData = { type: 'marker', ring: ring, sphere: sphere };
    return group;
  }

  static createCollisionIndicator(x, z) {
    const geometry = new THREE.SphereGeometry(0.6, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.set(x, 0.5, z);
    indicator.userData = { type: 'collision' };
    return indicator;
  }
}
