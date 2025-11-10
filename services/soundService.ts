import InCallManager from 'react-native-incall-manager';

class SoundService {
  private sosPlaying = false;
  private ringtoneActive = false;
  private assignmentActive = false;

  public async playSOSSound() {
    if (this.sosPlaying) return;

    this.sosPlaying = true;

    try {
      console.log('SoundService: Playing SOS sound');
      setTimeout(() => {
        this.sosPlaying = false;
      }, 3000);
    } catch (error) {
      console.error('SoundService: Error playing sound:', error);
      this.sosPlaying = false;
    }
  }

  public stopSound() {
    this.sosPlaying = false;
  }

  public startIncomingCallRingtone() {
    if (this.ringtoneActive) {
      return;
    }
    try {
      InCallManager.start({ media: 'audio' });
      InCallManager.startRingtone('_DEFAULT_');
      this.ringtoneActive = true;
      console.log('SoundService: Incoming ringtone started');
    } catch (error) {
      console.error('SoundService: Error starting ringtone:', error);
      this.ringtoneActive = false;
    }
  }

  public stopIncomingCallRingtone() {
    if (!this.ringtoneActive) {
      return;
    }
    try {
      InCallManager.stopRingtone();
      InCallManager.stop();
    } catch (error) {
      console.error('SoundService: Error stopping ringtone:', error);
    } finally {
      this.ringtoneActive = false;
      console.log('SoundService: Incoming ringtone stopped');
    }
  }

  public startAssignmentAlert() {
    if (this.assignmentActive) {
      return;
    }
    try {
      InCallManager.start({ media: 'audio' });
      InCallManager.startRingback('_DEFAULT_');
      this.assignmentActive = true;
      console.log('SoundService: Assignment alert started');
    } catch (error) {
      console.error('SoundService: Error starting assignment alert:', error);
      this.assignmentActive = false;
    }
  }

  public stopAssignmentAlert() {
    if (!this.assignmentActive) {
      return;
    }
    try {
      InCallManager.stopRingback();
      InCallManager.stop();
    } catch (error) {
      console.error('SoundService: Error stopping assignment alert:', error);
    } finally {
      this.assignmentActive = false;
      console.log('SoundService: Assignment alert stopped');
    }
  }
}

export const soundService = new SoundService();
