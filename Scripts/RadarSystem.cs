using System.Collections.Generic;
using UnityEngine;

public class RadarSystem : MonoBehaviour
{
    [SerializeField] private float scanRange = 15.0f;
    [SerializeField] private float scanInterval = 0.2f;
    [SerializeField] private LayerMask enemyLayer;

    private List<Enemy> enemiesInRange = new List<Enemy>();
    private float scanTimer;
    private Enemy nearestEnemy;

    public float ScanRange => scanRange;
    public List<Enemy> EnemiesInRange => enemiesInRange;
    public Enemy NearestEnemy => nearestEnemy;

    public delegate void OnNearestEnemyChanged(Enemy oldEnemy, Enemy newEnemy);
    public event OnNearestEnemyChanged OnNearestEnemyChangedEvent;

    private void Update()
    {
        UpdateScanTimer();
    }

    private void UpdateScanTimer()
    {
        scanTimer += Time.deltaTime;
        if (scanTimer >= scanInterval)
        {
            ScanForEnemies();
            scanTimer = 0.0f;
        }
    }

    public void ScanForEnemies()
    {
        Collider[] hitColliders = Physics.OverlapSphere(
            transform.position,
            scanRange,
            enemyLayer
        );

        UpdateEnemiesInRange(hitColliders);
        FindNearestEnemy();
    }

    private void UpdateEnemiesInRange(Collider[] hitColliders)
    {
        enemiesInRange.Clear();

        foreach (Collider collider in hitColliders)
        {
            Enemy enemy = collider.GetComponent<Enemy>();
            if (enemy != null && enemy.IsActive)
            {
                enemiesInRange.Add(enemy);
            }
        }
    }

    private void FindNearestEnemy()
    {
        Enemy oldNearest = nearestEnemy;
        nearestEnemy = null;
        float nearestDistance = Mathf.Infinity;

        foreach (Enemy enemy in enemiesInRange)
        {
            float distance = Vector3.Distance(transform.position, enemy.transform.position);
            if (distance < nearestDistance)
            {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }

        if (oldNearest != nearestEnemy)
        {
            OnNearestEnemyChangedEvent?.Invoke(oldNearest, nearestEnemy);
        }
    }

    public bool HasTarget()
    {
        return nearestEnemy != null && nearestEnemy.IsActive;
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.cyan;
        Gizmos.DrawWireSphere(transform.position, scanRange);

        if (nearestEnemy != null && nearestEnemy.IsActive)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawLine(transform.position, nearestEnemy.transform.position);
        }
    }
}
