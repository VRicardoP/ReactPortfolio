import { useMemo } from 'react';
import usePortfolioData from './usePortfolioData';

// Extract all skill keywords from portfolio data (lowercased, deduplicated)
const extractPortfolioSkills = (techSkills) => {
    if (!techSkills) return [];
    const all = [];
    for (const category of Object.values(techSkills)) {
        for (const skill of category) {
            // Split compound names like "Python / FastAPI" into ["python", "fastapi"]
            const parts = skill.name.split(/[/,&+]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
            all.push(...parts);
        }
    }
    return [...new Set(all)];
};

// Calculate match score between portfolio skills and a job's tags/skills
const calculateMatchScore = (portfolioSkills, jobSkills) => {
    if (!portfolioSkills.length || !jobSkills.length) return 0;

    const jobLower = jobSkills.map(s => s.toLowerCase().trim());
    let matched = 0;

    for (const jobSkill of jobLower) {
        const found = portfolioSkills.some(ps =>
            jobSkill.includes(ps) || ps.includes(jobSkill)
        );
        if (found) matched++;
    }

    return Math.round((matched / jobLower.length) * 100);
};

/**
 * Compute skill match score for a single job.
 * Returns 0-100 integer.
 */
export const getJobMatchScore = (portfolioSkills, job, skillsFields = ['tags', 'skills']) => {
    let jobSkills = [];
    for (const field of skillsFields) {
        const val = job[field];
        if (Array.isArray(val)) {
            jobSkills.push(...val);
        } else if (typeof val === 'string' && val) {
            jobSkills.push(...val.split(/[,/]+/).map(s => s.trim()));
        }
    }
    return calculateMatchScore(portfolioSkills, jobSkills);
};

/**
 * Hook that loads portfolio skills automatically and returns a score function.
 * Use: const getScore = useSkillsMatching();
 *      const score = getScore(job); // 0-100
 */
const useSkillsMatching = (skillsFields = ['tags', 'skills']) => {
    const { data: portfolioData } = usePortfolioData();

    const portfolioSkills = useMemo(
        () => extractPortfolioSkills(portfolioData?.techSkills),
        [portfolioData]
    );

    const getScore = useMemo(() => {
        if (!portfolioSkills.length) return () => 0;
        return (job) => getJobMatchScore(portfolioSkills, job, skillsFields);
    }, [portfolioSkills, skillsFields]);

    return getScore;
};

export default useSkillsMatching;
