using UnityEngine;

public static class FlockSettings
{
    public static readonly float SeparationRadius = 2.0f;
    public static readonly float AlignmentRadius = 4.0f;
    public static readonly float CohesionRadius = 5.0f;
    
    public static readonly float SeparationWeight = 2.5f;
    public static readonly float AlignmentWeight = 1.2f;
    public static readonly float CohesionWeight = 1.5f;
    public static readonly float TargetWeight = 3.0f;
    
    public static readonly float MaxSpeed = 6.0f;
    public static readonly float MinSpeed = 1.0f;
    public static readonly float MaxSteerForce = 3.0f;
    
    public static readonly float ArrivalRadius = 1.5f;
    public static readonly float SlowingRadius = 4.0f;
    
    public static readonly float UnitRadius = 0.5f;
    public static readonly float CollisionAvoidanceDistance = 1.5f;
    
    public static readonly float NeighborSearchInterval = 0.1f;
    public static readonly int MaxNeighbors = 20;
}
