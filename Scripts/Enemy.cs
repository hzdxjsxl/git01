using UnityEngine;

public class Enemy : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 3.0f;
    [SerializeField] private float maxHealth = 100.0f;
    [SerializeField] private float distanceToReachTarget = 0.1f;

    private float currentHealth;
    private Transform[] waypoints;
    private int currentWaypointIndex = 0;
    private Vector3 velocity;
    private bool isActive = true;

    public float MoveSpeed => moveSpeed;
    public Vector3 Velocity => velocity;
    public bool IsActive => isActive;

    private void Awake()
    {
        currentHealth = maxHealth;
    }

    public void Initialize(Transform[] pathWaypoints)
    {
        waypoints = pathWaypoints;
        currentWaypointIndex = 0;
        isActive = true;
        currentHealth = maxHealth;

        if (waypoints != null && waypoints.Length > 0)
        {
            transform.position = waypoints[0].position;
        }
    }

    private void Update()
    {
        if (!isActive || waypoints == null || waypoints.Length == 0)
            return;

        MoveAlongPath();
    }

    private void MoveAlongPath()
    {
        if (currentWaypointIndex >= waypoints.Length)
        {
            isActive = false;
            return;
        }

        Vector3 targetPosition = waypoints[currentWaypointIndex].position;
        targetPosition.y = transform.position.y;

        Vector3 moveDirection = (targetPosition - transform.position).normalized;
        velocity = moveDirection * moveSpeed;

        transform.position += velocity * Time.deltaTime;
        transform.rotation = Quaternion.LookRotation(moveDirection);

        float distanceToTarget = Vector3.Distance(transform.position, targetPosition);
        if (distanceToTarget < distanceToReachTarget)
        {
            currentWaypointIndex++;
        }
    }

    public void TakeDamage(float damage)
    {
        currentHealth -= damage;
        if (currentHealth <= 0)
        {
            Die();
        }
    }

    private void Die()
    {
        isActive = false;
        Destroy(gameObject);
    }
}
