
import { AutomatedJob } from '../types';

export const extractJobsFromHtml = (html: string): AutomatedJob[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const jobs: AutomatedJob[] = [];
  
  // The user specifies h3 with specific classes or similar patterns
  const headings = doc.querySelectorAll('h3.wp-block-heading');
  
  headings.forEach((heading, index) => {
    // We only care about headings that seem like job titles (not site menus)
    const title = heading.textContent?.trim() || 'Untitled Position';
    if (title.length < 3 || title.toLowerCase().includes('search')) return;

    // The metadata is typically in the immediate next P tag
    const infoPara = heading.nextElementSibling;
    let location = 'Not specified';
    let positions = 'N/A';
    let studentType = 'N/A';
    let deadline = 'N/A';
    let description = '';

    if (infoPara && infoPara.tagName === 'P') {
      // Location is usually in em tags
      const emTag = infoPara.querySelector('em');
      if (emTag) location = emTag.textContent?.trim() || location;

      // Other metadata in strong tags
      const strongTags = infoPara.querySelectorAll('strong');
      strongTags.forEach(strong => {
        const label = strong.textContent?.toLowerCase() || '';
        const content = strong.nextSibling?.textContent?.trim().replace(/^:\s*/, '') || '';
        
        if (label.includes('positions')) positions = content;
        if (label.includes('type of student')) studentType = content;
        if (label.includes('deadline')) deadline = content;
      });

      // Description is everything after the metadata until the next heading
      let currentPara = infoPara.nextElementSibling;
      while (currentPara && currentPara.tagName === 'P' && !currentPara.classList.contains('wp-block-heading')) {
        description += currentPara.textContent?.trim() + '\n\n';
        currentPara = currentPara.nextElementSibling;
      }
    }

    // Determine status based on deadline text
    let status: AutomatedJob['status'] = 'available';
    if (deadline !== 'N/A') {
      try {
        const deadlineDate = new Date(deadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
          status = 'expired';
        }
      } catch (e) {
        // Fallback: If "Deadline: Passed" or similar strings are used
        if (deadline.toLowerCase().includes('passed') || deadline.toLowerCase().includes('closed')) {
          status = 'expired';
        }
      }
    }

    jobs.push({
      id: `job-${index}-${title.replace(/\s+/g, '-').toLowerCase()}`,
      title,
      location,
      positions,
      studentType,
      deadline,
      description: description.trim(),
      status
    });
  });

  return jobs;
};
