import React from 'react';

/**
 * Maps system-wide status strings to designated styles.
 */
export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = status.trim().toUpperCase();

  let badgeClass = "badge-secondary";
  let displayName = status;
  
  switch (normalized) {
    // Active / Success States
    case 'ACTIVE':
    case 'SUCCESSFUL':
    case 'PAID':
    case 'RECOVERED':
    case 'EXCELLENT':
    case 'GOOD':
    case 'WEANING READY':
      badgeClass = "badge-success";
      break;

    // Warning / Pending States
    case 'PENDING':
    case 'PREGNANT':
    case 'PREGNANCY':
    case 'LACTATING':
    case 'INSEMINATION':
    case 'ARTIFICIAL INSEMINATION':
    case 'FAIR':
    case 'UNDER OBSERVATION':
    case 'LOW STOCK':
    case 'RECOVERING':
    case 'IN HEAT':
    case 'HEAT':
      badgeClass = "badge-warning";
      if (normalized === 'IN HEAT' || normalized === 'HEAT') displayName = 'Heat';
      if (normalized === 'PREGNANT' || normalized === 'PREGNANCY') displayName = 'Pregnancy';
      break;

    // Danger / Alert States
    case 'DEAD':
    case 'CULLED':
    case 'FAILED':
    case 'EXPIRED':
    case 'OUT OF STOCK':
    case 'INACTIVE':
    case 'SLAUGHTERED':
    case 'POOR':
    case 'CRITICAL':
      badgeClass = "badge-danger";
      break;

    // Info / Neutral States
    case 'WEANED':
    case 'GROWER':
    case 'PIGLET':
    case 'SOW':
    case 'BOAR':
    case 'NATURAL':
    case 'INCOME':
    case 'AVAILABLE':
    case 'BREEDING CANDIDATE':
    case 'UNDER TREATMENT':
    case 'VACCINE':
    case 'ANTIBIOTIC':
    case 'DEWORMER':
    case 'VITAMIN':
    case 'OTHER':
    case 'PREGNANCY PENDING':
    case 'PENDING CONFIRMATION':
    case 'MATING':
      badgeClass = "badge-info";
      if (normalized === 'PREGNANCY PENDING' || normalized === 'PENDING CONFIRMATION' || normalized === 'MATING') {
        displayName = 'Mating';
      }
      break;
      
    case 'EXPENSE':
    case 'SOLD':
    case 'PROMOTED':
    case 'PROMOTED TO SOW':
    case 'PROMOTED TO BOAR':
    case 'RETIRED':
      badgeClass = "badge-secondary";
      break;

    default:
      badgeClass = "badge-secondary";
  }

  return (
    <span className={badgeClass}>
      {displayName}
    </span>
  );
}
