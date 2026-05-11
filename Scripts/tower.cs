using UnityEngine;

public class Tower : MonoBehaviour
{
    [SerializeField] private Transform turretTransform;
    [SerializeField] private Transform firePointTransform;
    [SerializeField] private GameObject projectilePrefab;
    [SerializeField] private float fireRate = 1.0f;
    [SerializeField] private float rotationSpeed = 10.0f;
    [SerializeField] private int maxPredictionIterations = 5;
    [SerializeField] private float predictionTolerance = 0.01f;

    private RadarSystem radar;
    private float fireTimer;
    private bool canFire = true;

    private void Awake()
    {
        radar = GetComponent<RadarSystem>();
        if (radar == null)
        {
            radar = gameObject.AddComponent<RadarSystem>();
        }
    }

    private void Update()
    {
        UpdateFireCooldown();
        
        if (radar.HasTarget())
        {
            AimAtTarget();
            
            if (canFire && IsAimingAtTarget())
            {
                FireProjectile();
            }
        }
    }

    private void UpdateFireCooldown()
    {
        if (!canFire)
        {
            fireTimer += Time.deltaTime;
            if (fireTimer >= 1.0f / fireRate)
            {
                canFire = true;
                fireTimer = 0.0f;
            }
        }
    }

    private void AimAtTarget()
    {
        Enemy target = radar.NearestEnemy;
        if (target == null)
            return;

        Vector3 predictedPosition = CalculatePredictedPosition(target);
        RotateTurretTowards(predictedPosition);
    }

    private void RotateTurretTowards(Vector3 targetPosition)
    {
        if (turretTransform == null)
            return;

        Vector3 direction = (targetPosition - turretTransform.position).normalized;
        direction.y = 0;

        if (direction == Vector3.zero)
            return;

        Quaternion targetRotation = Quaternion.LookRotation(direction);
        turretTransform.rotation = Quaternion.Slerp(
            turretTransform.rotation,
            targetRotation,
            rotationSpeed * Time.deltaTime
        );
    }

    private bool IsAimingAtTarget()
    {
        Enemy target = radar.NearestEnemy;
        if (target == null || turretTransform == null)
            return false;

        Vector3 predictedPosition = CalculatePredictedPosition(target);
        Vector3 direction = (predictedPosition - turretTransform.position).normalized;
        direction.y = 0;

        float angleDifference = Vector3.Angle(turretTransform.forward, direction);
        return angleDifference < 5.0f;
    }

    public Vector3 CalculatePredictedPosition(Enemy target)
    {
        if (target == null || projectilePrefab == null)
            return Vector3.zero;

        Projectile projectileScript = projectilePrefab.GetComponent<Projectile>();
        if (projectileScript == null)
            return target.transform.position;

        float projectileSpeed = projectileScript.Speed;
        Vector3 shooterPosition = firePointTransform != null ? firePointTransform.position : transform.position;
        Vector3 targetPosition = target.transform.position;
        Vector3 targetVelocity = target.Velocity;

        Vector3 relativePosition = targetPosition - shooterPosition;
        relativePosition.y = 0;

        Vector3 relativeVelocity = targetVelocity;
        relativeVelocity.y = 0;

        float timeToHit = CalculateFlightTime(
            relativePosition,
            relativeVelocity,
            projectileSpeed
        );

        Vector3 predictedPosition = targetPosition + targetVelocity * timeToHit;
        return predictedPosition;
    }

    private float CalculateFlightTime(
        Vector3 relativePosition,
        Vector3 relativeVelocity,
        float projectileSpeed
    )
    {
        float initialEstimate = relativePosition.magnitude / projectileSpeed;

        for (int i = 0; i < maxPredictionIterations; i++)
        {
            Vector3 predictedPosition = relativePosition + relativeVelocity * initialEstimate;
            float distance = predictedPosition.magnitude;

            float newTime = distance / projectileSpeed;

            if (Mathf.Abs(newTime - initialEstimate) < predictionTolerance)
            {
                return newTime;
            }

            initialEstimate = newTime;
        }

        return initialEstimate;
    }

    private void FireProjectile()
    {
        if (projectilePrefab == null || firePointTransform == null)
            return;

        Enemy target = radar.NearestEnemy;
        if (target == null)
            return;

        Vector3 predictedPosition = CalculatePredictedPosition(target);

        GameObject projectileObject = Instantiate(
            projectilePrefab,
            firePointTransform.position,
            firePointTransform.rotation
        );

        Projectile projectile = projectileObject.GetComponent<Projectile>();
        if (projectile != null)
        {
            projectile.Fire(target.transform, predictedPosition);
        }

        canFire = false;
    }

    private void OnDrawGizmosSelected()
    {
        if (radar != null && radar.NearestEnemy != null && radar.NearestEnemy.IsActive)
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(radar.NearestEnemy.transform.position, 0.5f);

            Vector3 predictedPosition = CalculatePredictedPosition(radar.NearestEnemy);
            Gizmos.color = Color.magenta;
            Gizmos.DrawWireSphere(predictedPosition, 0.5f);

            Gizmos.DrawLine(
                transform.position,
                predictedPosition
            );
        }
    }
}
