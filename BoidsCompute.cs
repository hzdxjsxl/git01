using UnityEngine;
using System.Collections.Generic;

public static class BoidsCompute
{
    public static Vector3 ComputeTotalForce(
        Vector3 currentPosition,
        Vector3 currentVelocity,
        Vector3 targetPosition,
        List<UnitMover> neighbors)
    {
        Vector3 separation = ComputeSeparation(currentPosition, neighbors);
        Vector3 alignment = ComputeAlignment(currentVelocity, neighbors);
        Vector3 cohesion = ComputeCohesion(currentPosition, neighbors);
        Vector3 targetSteering = ComputeTargetSteering(currentPosition, currentVelocity, targetPosition);

        separation *= FlockSettings.SeparationWeight;
        alignment *= FlockSettings.AlignmentWeight;
        cohesion *= FlockSettings.CohesionWeight;
        targetSteering *= FlockSettings.TargetWeight;

        Vector3 totalForce = separation + alignment + cohesion + targetSteering;
        totalForce = Vector3.ClampMagnitude(totalForce, FlockSettings.MaxSteerForce);

        return totalForce;
    }

    private static Vector3 ComputeSeparation(Vector3 currentPosition, List<UnitMover> neighbors)
    {
        Vector3 separation = Vector3.zero;
        int count = 0;

        foreach (var neighbor in neighbors)
        {
            if (neighbor == null) continue;
            
            Vector3 diff = currentPosition - neighbor.transform.position;
            float distance = diff.magnitude;

            if (distance > 0 && distance < FlockSettings.SeparationRadius)
            {
                float influence = 1f - (distance / FlockSettings.SeparationRadius);
                separation += diff.normalized * influence;
                count++;
            }
        }

        if (count > 0)
        {
            separation /= count;
        }

        return separation;
    }

    private static Vector3 ComputeAlignment(Vector3 currentVelocity, List<UnitMover> neighbors)
    {
        Vector3 alignment = Vector3.zero;
        int count = 0;

        foreach (var neighbor in neighbors)
        {
            if (neighbor == null) continue;
            
            float distance = Vector3.Distance(
                neighbor.transform.position, 
                currentPosition);

            if (distance > 0 && distance < FlockSettings.AlignmentRadius)
            {
                alignment += neighbor.CurrentVelocity;
                count++;
            }
        }

        if (count > 0)
        {
            alignment /= count;
            alignment = Vector3.ClampMagnitude(alignment, FlockSettings.MaxSpeed);
            alignment -= currentVelocity;
        }

        return alignment;
    }

    private static Vector3 ComputeCohesion(Vector3 currentPosition, List<UnitMover> neighbors)
    {
        Vector3 centerOfMass = Vector3.zero;
        int count = 0;

        foreach (var neighbor in neighbors)
        {
            if (neighbor == null) continue;
            
            float distance = Vector3.Distance(
                neighbor.transform.position, 
                currentPosition);

            if (distance > 0 && distance < FlockSettings.CohesionRadius)
            {
                centerOfMass += neighbor.transform.position;
                count++;
            }
        }

        if (count == 0)
        {
            return Vector3.zero;
        }

        centerOfMass /= count;
        return Seek(currentPosition, centerOfMass);
    }

    private static Vector3 Seek(Vector3 currentPosition, Vector3 target)
    {
        Vector3 desired = target - currentPosition;
        desired.Normalize();
        desired *= FlockSettings.MaxSpeed;
        return desired;
    }

    private static Vector3 ComputeTargetSteering(
        Vector3 currentPosition,
        Vector3 currentVelocity,
        Vector3 targetPosition)
    {
        Vector3 desired = targetPosition - currentPosition;
        float distance = desired.magnitude;

        if (distance < FlockSettings.ArrivalRadius)
        {
            return Vector3.zero - currentVelocity;
        }

        if (distance < FlockSettings.SlowingRadius)
        {
            float slowFactor = distance / FlockSettings.SlowingRadius;
            desired.Normalize();
            desired *= FlockSettings.MaxSpeed * slowFactor;
        }
        else
        {
            desired.Normalize();
            desired *= FlockSettings.MaxSpeed;
        }

        Vector3 steer = desired - currentVelocity;
        return Vector3.ClampMagnitude(steer, FlockSettings.MaxSteerForce);
    }

    public static Vector3 ApplyForce(Vector3 velocity, Vector3 force, float deltaTime)
    {
        velocity += force * deltaTime;
        
        if (velocity.magnitude > FlockSettings.MaxSpeed)
        {
            velocity = velocity.normalized * FlockSettings.MaxSpeed;
        }
        else if (velocity.magnitude > 0 && velocity.magnitude < FlockSettings.MinSpeed)
        {
            velocity = velocity.normalized * FlockSettings.MinSpeed;
        }

        return velocity;
    }

    public static bool HasReachedTarget(Vector3 currentPosition, Vector3 targetPosition)
    {
        float distance = Vector3.Distance(currentPosition, targetPosition);
        return distance < FlockSettings.ArrivalRadius;
    }

    public static List<UnitMover> FindNeighbors(
        Vector3 position,
        List<UnitMover> allUnits,
        UnitMover excludeSelf)
    {
        List<UnitMover> neighbors = new List<UnitMover>();
        float searchRadius = FlockSettings.CohesionRadius;

        foreach (var unit in allUnits)
        {
            if (unit == null || unit == excludeSelf) continue;
            if (neighbors.Count >= FlockSettings.MaxNeighbors) break;

            float distance = Vector3.Distance(unit.transform.position, position);
            if (distance <= searchRadius)
            {
                neighbors.Add(unit);
            }
        }

        return neighbors;
    }
}
