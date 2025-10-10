import React, { FC } from 'react';
import CrimeReportDetailComponent from '../../../CrimeReportDetail';

interface CrimeReportDetailProps {
  reportId: string;
  onClose: () => void;
}

const CrimeReportDetail: FC<CrimeReportDetailProps> = ({ reportId, onClose }) => {
  return <CrimeReportDetailComponent reportId={reportId} onClose={onClose} />;
};

export default CrimeReportDetail;

