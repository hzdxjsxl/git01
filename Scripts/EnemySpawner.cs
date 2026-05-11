using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    [SerializeField] private GameObject enemyPrefab;
    [SerializeField] private Transform[] waypoints;
    [SerializeField] private float spawnInterval = 3.0f;
    [SerializeField] private int maxEnemies = 10;

    private float spawnTimer;
    private int enemiesSpawned;

    private void Update()
    {
        if (enemiesSpawned >= maxEnemies)
            return;

        spawnTimer += Time.deltaTime;
        if (spawnTimer >= spawnInterval)
        {
            SpawnEnemy();
            spawnTimer = 0.0f;
        }
    }

    private void SpawnEnemy()
    {
        if (enemyPrefab == null || waypoints == null || waypoints.Length == 0)
            return;

        GameObject enemyObject = Instantiate(enemyPrefab, transform.position, transform.rotation);
        Enemy enemy = enemyObject.GetComponent<Enemy>();

        if (enemy != null)
        {
            enemy.Initialize(waypoints);
        }

        enemiesSpawned++;
    }
}
