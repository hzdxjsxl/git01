using UnityEngine;

public class Projectile : MonoBehaviour
{
    [SerializeField] private float projectileSpeed = 15.0f;
    [SerializeField] private float damage = 25.0f;
    [SerializeField] private float maxLifetime = 5.0f;

    private Transform targetTransform;
    private Vector3 targetPosition;
    private Vector3 direction;
    private bool isFired = false;
    private float lifetimeTimer;

    public float Speed => projectileSpeed;

    private void Update()
    {
        if (!isFired)
            return;

        UpdateLifetime();
        MoveProjectile();
    }

    public void Fire(Transform target, Vector3 predictedPosition)
    {
        targetTransform = target;
        targetPosition = predictedPosition;
        direction = (targetPosition - transform.position).normalized;
        isFired = true;
        lifetimeTimer = 0.0f;
    }

    private void UpdateLifetime()
    {
        lifetimeTimer += Time.deltaTime;
        if (lifetimeTimer >= maxLifetime)
        {
            Destroy(gameObject);
        }
    }

    private void MoveProjectile()
    {
        transform.position += direction * projectileSpeed * Time.deltaTime;
    }

    private void OnTriggerEnter(Collider other)
    {
        if (!isFired)
            return;

        Enemy enemy = other.GetComponent<Enemy>();
        if (enemy != null)
        {
            enemy.TakeDamage(damage);
            Destroy(gameObject);
        }
    }
}
