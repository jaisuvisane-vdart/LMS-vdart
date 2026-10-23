import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { downloadBlobFile } from './downloadHelper';

/**
 * Enterprise Certificate Export & LinkedIn Integration Helper
 * Provides high-DPI canvas capture, vector PDF generation, and official LinkedIn deep-linking
 */

/**
 * Export a DOM element certificate as a high-resolution PNG image
 * @param {string} elementId - Target DOM element ID (e.g. 'printable-certificate')
 * @param {string} filename - Output file name
 */
export const exportCertificateAsImage = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Certificate element not found.');
  }

  const canvas = await html2canvas(element, {
    scale: 2, // 2x DPI for crisp high-resolution rendering
    useCORS: true,
    logging: false,
    backgroundColor: '#FAFBFD',
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image from certificate canvas.'));
          return;
        }
        const sanitizedFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
        downloadBlobFile(blob, sanitizedFilename, 'image/png');
        resolve();
      },
      'image/png',
      1.0
    );
  });
};

/**
 * Export a DOM element certificate as an official vector-bordered landscape PDF
 * @param {string} elementId - Target DOM element ID
 * @param {string} filename - Output file name
 */
export const exportCertificateAsPdf = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Certificate element not found.');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#FAFBFD',
  });

  const imgData = canvas.toDataURL('image/png');

  // A4 Landscape dimensions: 297mm width x 210mm height
  const pdfWidth = 297;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Center vertically on A4 page
  const posY = Math.max(0, (210 - pdfHeight) / 2);
  pdf.addImage(imgData, 'PNG', 0, posY, pdfWidth, pdfHeight, undefined, 'FAST');

  const sanitizedFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(sanitizedFilename);
};

/**
 * Generate official LinkedIn "Add to Profile" Certification Deep-Link
 * Pre-populates the LinkedIn Licenses & Certifications modal
 * @param {object} certificate - Certificate record
 * @param {string} publicVerifyUrl - Public verification URL
 * @returns {string} Official LinkedIn URL
 */
export const generateLinkedInCertUrl = (certificate, publicVerifyUrl) => {
  const issueDate = certificate?.issued_at ? new Date(certificate.issued_at) : new Date();
  const issueYear = issueDate.getFullYear();
  const issueMonth = issueDate.getMonth() + 1;

  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: certificate?.course_title || 'Certificate of Completion',
    organizationName: 'VDart Inc.',
    issueYear: String(issueYear),
    issueMonth: String(issueMonth),
    certUrl: publicVerifyUrl,
    certId: certificate?.certificate_code || '',
  });

  return `https://www.linkedin.com/profile/add?${params.toString()}`;
};

/**
 * Generate LinkedIn Share Post URL
 * @param {string} publicVerifyUrl - Public verification URL
 * @returns {string} LinkedIn Post Creator URL
 */
export const generateLinkedInShareUrl = (publicVerifyUrl) => {
  const params = new URLSearchParams({
    url: publicVerifyUrl,
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
};

/**
 * Generate LinkedIn Feed Post URL with pre-filled announcement text
 * @param {string} postText - Text to pre-fill in the LinkedIn feed post composer
 * @returns {string} LinkedIn Feed URL
 */
export const generateLinkedInFeedPostUrl = (postText) => {
  const params = new URLSearchParams({
    shareActive: 'true',
    text: postText || '',
  });
  return `https://www.linkedin.com/feed/?${params.toString()}`;
};

/**
 * Clean and format LinkedIn profile URL
 * @param {string} input - User input profile string or URL
 * @returns {string} Valid LinkedIn URL or empty string
 */
export const formatLinkedInProfileUrl = (input) => {
  if (!input) return '';
  let trimmed = input.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.startsWith('linkedin.com/')) {
      trimmed = 'https://www.' + trimmed;
    } else if (trimmed.startsWith('www.linkedin.com/')) {
      trimmed = 'https://' + trimmed;
    } else {
      trimmed = `https://www.linkedin.com/in/${trimmed.replace(/^\/+|\/+$/g, '')}`;
    }
  }
  return trimmed;
};

/**
 * Get direct URL to the user's LinkedIn profile certifications section
 * @param {string} profileUrl - User's profile URL
 * @returns {string} Direct certifications section URL
 */
export const getLinkedInCertificationsUrl = (profileUrl) => {
  const formatted = formatLinkedInProfileUrl(profileUrl);
  if (!formatted) return 'https://www.linkedin.com/in/';
  const clean = formatted.replace(/\/+$/, '');
  return `${clean}/details/certifications/`;
};

/**
 * Generate standard celebratory text for copying to LinkedIn post
 * @param {object} certificate
 * @param {string} publicVerifyUrl
 * @returns {string} Pre-crafted post copy
 */
export const generateCelebratoryPostText = (certificate, publicVerifyUrl) => {
  const course = certificate?.course_title || 'Professional Training';
  return `I am proud to share that I have successfully completed the ${course} curriculum at VDart Inc. and earned this verified certification!\n\nVerify my credential: ${publicVerifyUrl}\n\n#VDart #LearningAndDevelopment #ProfessionalGrowth #Certification #ContinuousLearning`;
};

export default {
  exportCertificateAsImage,
  exportCertificateAsPdf,
  generateLinkedInCertUrl,
  generateLinkedInShareUrl,
  generateLinkedInFeedPostUrl,
  formatLinkedInProfileUrl,
  getLinkedInCertificationsUrl,
  generateCelebratoryPostText,
};
