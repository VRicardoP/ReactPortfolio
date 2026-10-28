import { useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_BACKEND_URL } from '../config/api';

const SKILLS_TOGGLE_URL = `${ADMIN_BACKEND_URL}/api/v1/cv-profiles/skills`;

/**
 * Extracts and manages the aggregated missing skills from AI match results.
 * Provides toggle functionality to add/remove skills from the CV in the database.
 */
// Junta todas las habilidades que faltan en las ofertas analizadas, y
// permite añadirlas o quitarlas del currículum guardado con un solo clic.
const useSkillsGap = (results) => {
  const { authenticatedFetch } = useAuth();
  const [addedSkills, setAddedSkills] = useState(new Set());
  const [togglingSkills, setTogglingSkills] = useState(new Set());
  const togglingSkillsRef = useRef(new Set());
  const [lastError, setLastError] = useState(null);

  // Aggregate all unique missing skills, exclude already-added, sorted alphabetically
  // Reúne todas las habilidades que faltan (sin repetir y sin las que ya se
  // hayan añadido), ordenadas alfabéticamente.
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

  // Añade o quita una habilidad del currículum guardado en el servidor.
  const toggleSkill = useCallback(async (skillName) => {
    if (togglingSkillsRef.current.has(skillName)) return null;
    togglingSkillsRef.current.add(skillName);
    setTogglingSkills(new Set(togglingSkillsRef.current));
    const isAdded = addedSkills.has(skillName);
    setLastError(null);
    try {
      // DT-187: ya no se guarda la respuesta. Aquí había un
      // `if (!response.ok) throw …` inalcanzable, porque `authenticatedFetch`
      // lanza antes y con el detalle del cuerpo; sin esa rama, la respuesta no
      // se usa para nada.
      await authenticatedFetch(SKILLS_TOGGLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillName,
          add: !isAdded,
        }),
      });
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
      if (import.meta.env.DEV) {
        console.error('Skill toggle error:', err);
      }
      return null;
    } finally {
      togglingSkillsRef.current.delete(skillName);
      setTogglingSkills(new Set(togglingSkillsRef.current));
    }
  }, [addedSkills, authenticatedFetch]);

  return { missingSkills, addedSkills, togglingSkills, toggleSkill, lastError };
};

export default useSkillsGap;
