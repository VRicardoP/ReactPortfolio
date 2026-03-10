import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/api';

const SKILLS_TOGGLE_URL = `${BACKEND_URL}/api/v1/cv-profiles/skills`;

/**
 * Extracts and manages the aggregated missing skills from AI match results.
 * Provides toggle functionality to add/remove skills from the CV in the database.
 */
const useSkillsGap = (results) => {
  const { authenticatedFetch } = useAuth();
  const [addedSkills, setAddedSkills] = useState(new Set());
  const [togglingSkill, setTogglingSkill] = useState(null);
  const [lastError, setLastError] = useState(null);

  // Aggregate all unique missing skills, exclude already-added, sorted alphabetically
  const missingSkills = useMemo(() => {
    const skillSet = new Set();
    for (const job of results) {
      if (job.missing_skills) {
        for (const skill of job.missing_skills) {
          if (!addedSkills.has(skill)) {
            skillSet.add(skill);
          }
        }
      }
    }
    return [...skillSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [results, addedSkills]);

  const toggleSkill = useCallback(async (skillName) => {
    const isAdded = addedSkills.has(skillName);
    setTogglingSkill(skillName);
    setLastError(null);
    try {
      const response = await authenticatedFetch(SKILLS_TOGGLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillName,
          add: !isAdded,
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }
      setAddedSkills(prev => {
        const next = new Set(prev);
        if (isAdded) {
          next.delete(skillName);
        } else {
          next.add(skillName);
        }
        return next;
      });
      return !isAdded;
    } catch (err) {
      setLastError(err.message || 'Toggle failed');
      if (process.env.NODE_ENV !== 'production') {
        console.error('Skill toggle error:', err);
      }
      return null;
    } finally {
      setTogglingSkill(null);
    }
  }, [addedSkills, authenticatedFetch]);

  return { missingSkills, addedSkills, togglingSkill, toggleSkill, lastError };
};

export default useSkillsGap;
