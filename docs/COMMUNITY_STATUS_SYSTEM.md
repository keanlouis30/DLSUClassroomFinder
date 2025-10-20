# Community-Driven Classroom Status System

## Overview

The DLSU Classroom Finder uses a **crowdsourced, community-driven** approach to track real-time classroom occupancy. Students can report when they see a class in session, exam happening, or room empty - creating an accurate, live heat map.

## The Challenge: Trust vs. Abuse

### Problem
How do we trust student reports when anyone could lie about classroom status?

### Solution: Multi-Layer Verification System

We combine several anti-abuse mechanisms:

1. **Peer Verification** - Other students confirm or contradict reports
2. **Confidence Scoring** - Reports gain credibility with confirmations
3. **Spam Detection** - Automatic flagging of suspicious activity
4. **Reputation Tracking** - Users with many contradicted reports lose trust
5. **Time Expiration** - Reports auto-expire after expected end time

## How It Works

### 1. Student Reports Status

When a student sees a classroom:

```typescript
{
  reported_status: 'occupied' | 'available' | 'maintenance',
  report_type: 'class_in_session' | 'exam' | 'event' | 'empty' | 'maintenance_issue',
  details: 'CSALGCM class with Sir Smith',
  estimated_occupancy: 85,  // % of seats filled
  expected_end_time: '14:30'  // When class should end
}
```

**Initial Confidence: 50%** (unverified)

### 2. Other Students Verify

Other students passing by can:
- ✅ **Confirm** - "Yes, there IS a class here"
- ❌ **Contradict** - "No, this room is actually empty"

Optional evidence:
- Photo of the classroom
- Additional comment

### 3. Confidence Score Updates

The system calculates trust level:

```
Confidence = Confirmations / Total Verifications

Bonuses:
- 3+ verifications: +20% confidence boost
- Verified if: confidence >= 70% AND 2+ verifications
```

**Examples:**
- 0 verifications → 50% confidence (unverified)
- 2 confirms, 0 contradicts → 100% confidence ✅ (verified)
- 2 confirms, 1 contradicts → 66% → 86% (3+ bonus) ✅ (verified)
- 1 confirm, 2 contradicts → 33% ❌ (not shown)

### 4. Display Based on Confidence

Heat map only shows reports with:
- **Confidence ≥ 60%**
- **Not expired**

Low-confidence reports are hidden to prevent misinformation.

## Anti-Abuse Mechanisms

### 1. Rate Limiting
- Max 10 reports per hour per user
- One report per classroom per 15 minutes per user

### 2. Spam Detection

Automatic flagging if user:
- Submits >10 reports in 1 hour
- Has >70% of reports contradicted in past week

### 3. Reputation System

Users build reputation over time:
- Reports that get verified → Good reputation
- Reports that get contradicted → Bad reputation
- Low reputation users may get warnings/restrictions

### 4. Auto-Expiration

Reports expire automatically:
- At `expected_end_time` if specified
- After 3 hours if no end time specified
- When confidence drops to 0

### 5. Audit Logging

All reports and verifications are logged:
- Who reported what
- Who verified/contradicted
- Timestamp of actions
- Pattern analysis for abuse detection

## Database Schema

### Tables

```sql
classroom_status_reports (
  id, classroom_id, reported_by,
  reported_status, report_type,
  details, estimated_occupancy, expected_end_time,
  verification_count, contradiction_count,
  confidence_score, is_verified,
  expires_at, created_at, updated_at
)

status_report_verifications (
  id, report_id, verified_by,
  verification_type ('confirm' | 'contradict'),
  photo_url, comment, created_at
)
```

### Views

```sql
classroom_live_status (
  classroom_id, official_status,
  community_status, status_details,
  confidence, verifications, last_reported
)
```

## UI Implementation

### Room Detail Page - Report Status Button

```tsx
<button onClick={() => openReportModal()}>
  📍 Update Status
</button>

// Modal:
<ReportStatusModal>
  <select name="status">
    <option value="occupied">Occupied (Class/Event)</option>
    <option value="available">Empty</option>
    <option value="maintenance">Maintenance Issue</option>
  </select>
  
  <select name="type">
    <option value="class_in_session">Class in Session</option>
    <option value="exam">Exam Happening</option>
    <option value="event">Official Event</option>
    <option value="empty">Room is Empty</option>
    <option value="maintenance_issue">Needs Maintenance</option>
  </select>
  
  <textarea placeholder="Details (e.g., 'CSALGCM with Sir Smith')"/>
  
  <input type="time" placeholder="Expected end time"/>
  
  <input type="range" min="0" max="100" 
    placeholder="How full? (% occupancy)"/>
</ReportStatusModal>
```

### Display Community Status

```tsx
{communityStatus && (
  <div className="flex items-center gap-2">
    <span className={confidence >= 0.7 ? 'text-green-600' : 'text-yellow-600'}>
      {communityStatus === 'occupied' ? '🔴' : '🟢'}
    </span>
    <div>
      <p className="font-medium">
        {communityStatus === 'occupied' ? 'Occupied' : 'Available'}
      </p>
      <p className="text-xs text-gray-500">
        Reported: {statusDetails}
      </p>
      <p className="text-xs text-gray-400">
        {verifications} verifications • {Math.round(confidence * 100)}% confidence
        {isVerified && <span className="ml-1">✓ Verified</span>}
      </p>
    </div>
  </div>
)}
```

### Verify/Contradict Buttons

```tsx
{canVerify && (
  <div className="flex gap-2">
    <button onClick={() => verify('confirm')}>
      ✅ Confirm (This is accurate)
    </button>
    <button onClick={() => verify('contradict')}>
      ❌ Contradict (This is wrong)
    </button>
  </div>
)}
```

## API Routes

### POST /api/status/report

```typescript
{
  classroom_id: string,
  reported_status: 'occupied' | 'available' | 'maintenance',
  report_type: 'class_in_session' | 'exam' | 'event' | 'empty' | 'maintenance_issue',
  details?: string,
  estimated_occupancy?: number,
  expected_end_time?: string
}
```

Validation:
- Check spam detection
- Enforce rate limits
- Auto-calculate expiration time

### POST /api/status/verify/:reportId

```typescript
{
  verification_type: 'confirm' | 'contradict',
  photo_url?: string,
  comment?: string
}
```

Validation:
- User can't verify own report
- One verification per report per user
- Updates confidence score automatically

### GET /api/status/classroom/:classroomId

Returns current community status with confidence metrics.

## Gamification (Future)

To encourage participation:

### Badges
- 🎯 First Report
- ✅ 10 Verified Reports
- 🌟 Trusted Reporter (90%+ accuracy)
- 👁️ Eagle Eye (50+ verifications)

### Leaderboard
- Most accurate reporters
- Most helpful verifiers
- Weekly top contributors

### Rewards
- Priority access to new features
- Highlighted on community board
- Recognition in system

## Manager/Admin Override

Managers and Admins can:
- Mark reports as incorrect
- Ban abusive users
- See spam detection metrics
- View user reputation scores
- Override community status with official data

## Success Metrics

Track system effectiveness:

```sql
-- Accuracy rate
SELECT 
  AVG(CASE WHEN is_verified THEN 1 ELSE 0 END) as accuracy_rate
FROM classroom_status_reports
WHERE created_at > NOW() - INTERVAL '7 days';

-- Verification participation
SELECT 
  COUNT(DISTINCT verified_by) as active_verifiers
FROM status_report_verifications
WHERE created_at > NOW() - INTERVAL '7 days';

-- Coverage (% of classrooms with recent reports)
SELECT 
  COUNT(DISTINCT classroom_id)::FLOAT / 
  (SELECT COUNT(*) FROM classrooms) as coverage_rate
FROM classroom_status_reports
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Migration

Run this to enable the community status system:

```bash
supabase/migrations/010_community_status_updates.sql
```

## Benefits

### For Students
- ✅ Real-time, accurate classroom availability
- ✅ Community-powered information
- ✅ Know before you walk to a building

### For University
- ✅ Data on actual classroom usage
- ✅ Identify scheduling conflicts
- ✅ Better resource planning

### For System
- ✅ Self-correcting through verification
- ✅ Spam-resistant
- ✅ Scales with more users (more verifiers)

## Example Scenarios

### Scenario 1: Class Running Late
```
1. Student A: "LS302 occupied - CSALGCM class, ends 2:00 PM" (50%)
2. Student B passes by: ✅ Confirms (100% → Verified)
3. 2:00 PM: Still occupied? Student C: "Still going, now ends 2:30 PM"
4. Auto-expires at 2:30 PM
```

### Scenario 2: False Report
```
1. Troll: "HS201 occupied - fake class" (50%)
2. Student A passes by: ❌ Contradicts "Room is empty!" (0%)
3. Student B: ❌ Contradicts "Nobody here" (0%)
4. Report hidden (confidence < 60%)
5. Troll flagged for spam
```

### Scenario 3: Maintenance Issue
```
1. Student: "V501 maintenance - broken AC" (50%)
2. 3 students confirm: ✅✅✅ (100% + bonus → Verified)
3. Manager sees report → schedules repair
4. Manager marks as resolved
```

## Related Documentation

- `WARP.md` - Main project documentation
- `docs/HEATMAP_FEATURE.md` - Heat map system
- `supabase/migrations/010_community_status_updates.sql` - Database schema

