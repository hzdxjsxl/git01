using UnityEngine;
using System.Collections.Generic;

[RequireComponent(typeof(CharacterController))]
public class UnitMover : MonoBehaviour
{
    public Transform Owner => transform;
    public Vector3 CurrentVelocity { get; private set; }
    public Vector3 TargetPosition { get; private set; }
    public bool HasTarget { get; private set; }
    public bool IsMoving { get; private set; }

    private CharacterController controller;
    private List<UnitMover> neighbors;
    private float neighborUpdateTimer;
    private Vector3 targetPosition;
    private bool hasTarget;

    private static List<UnitMover> allUnits = new List<UnitMover>();

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
        neighbors = new List<UnitMover>();
        CurrentVelocity = Vector3.zero;
        targetPosition = Vector3.zero;
        hasTarget = false;
    }

    private void OnEnable()
    {
        allUnits.Add(this);
    }

    private void OnDisable()
    {
        allUnits.Remove(this);
    }

    private void Update()
    {
        UpdateNeighbors();
        
        if (HasTarget)
        {
            MoveWithBoids();
        }
        else
        {
            StopMoving();
        }
    }

    public void SetTarget(Vector3 newTargetPosition)
    {
        targetPosition = newTargetPosition;
        TargetPosition = newTargetPosition;
        hasTarget = true;
        HasTarget = true;
        IsMoving = true;
    }

    public void ClearTarget()
    {
        hasTarget = false;
        HasTarget = false;
        IsMoving = false;
        CurrentVelocity = Vector3.zero;
    }

    private void UpdateNeighbors()
    {
        neighborUpdateTimer -= Time.deltaTime;
        if (neighborUpdateTimer <= 0f)
        {
            neighbors = BoidsCompute.FindNeighbors(transform.position, allUnits, this);
            neighborUpdateTimer = FlockSettings.NeighborSearchInterval;
        }
    }

    private void MoveWithBoids()
    {
        if (BoidsCompute.HasReachedTarget(transform.position, targetPosition))
        {
            StopMoving();
            return;
        }

        Vector3 totalForce = BoidsCompute.ComputeTotalForce(
            transform.position,
            CurrentVelocity,
            targetPosition,
            neighbors);

        CurrentVelocity = BoidsCompute.ApplyForce(
            CurrentVelocity,
            totalForce,
            Time.deltaTime);

        ApplyGravity();

        Vector3 movement = CurrentVelocity * Time.deltaTime;
        controller.Move(movement);

        UpdateRotation();
    }

    private void ApplyGravity()
    {
        if (!controller.isGrounded)
        {
            CurrentVelocity += Physics.gravity * Time.deltaTime;
        }
        else if (CurrentVelocity.y < 0)
        {
            CurrentVelocity.y = -2f;
        }
    }

    private void UpdateRotation()
    {
        Vector3 horizontalVelocity = new Vector3(CurrentVelocity.x, 0, CurrentVelocity.z);
        if (horizontalVelocity.magnitude > 0.1f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(horizontalVelocity.normalized);
            transform.rotation = Quaternion.Slerp(
                transform.rotation,
                targetRotation,
                10f * Time.deltaTime);
        }
    }

    private void StopMoving()
    {
        CurrentVelocity = Vector3.Lerp(CurrentVelocity, Vector3.zero, 5f * Time.deltaTime);
        
        if (CurrentVelocity.magnitude < 0.1f)
        {
            CurrentVelocity = Vector3.zero;
            IsMoving = false;
        }

        ApplyGravity();
        controller.Move(CurrentVelocity * Time.deltaTime);
    }

    public static List<UnitMover> GetAllUnits()
    {
        return allUnits;
    }

    public static void SetTargetForSelectedUnits(List<UnitMover> selectedUnits, Vector3 targetPosition)
    {
        foreach (var unit in selectedUnits)
        {
            if (unit != null)
            {
                unit.SetTarget(targetPosition);
            }
        }
    }

    public static void ClearTargetForSelectedUnits(List<UnitMover> selectedUnits)
    {
        foreach (var unit in selectedUnits)
        {
            if (unit != null)
            {
                unit.ClearTarget();
            }
        }
    }
}
