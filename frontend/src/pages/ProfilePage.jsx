import { useState } from 'react';
import styles from './ProfilePage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function ProfilePage({ currentUser, onUpdateProfile }) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onUpdateProfile({ ...currentUser, displayName, bio, age, weight, height });
    setEditing(false);
    alert('Profile updated!');
  };

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Your Profile</h2>
      
      <div className={styles.profileGrid}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!editing}
            className={sharedStyles.input}
            style={{ backgroundColor: editing ? '#FFFFFC' : '#f5f5f5' }}
          />
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Email</label>
          <input
            type="email"
            value={currentUser.email}
            disabled
            className={sharedStyles.input}
          />
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!editing}
            className={sharedStyles.textarea}
            style={{ backgroundColor: editing ? '#FFFFFC' : '#f5f5f5' }}
            placeholder="Tell us about your fitness journey..."
          />
        </div>

        <div className={styles.statsGrid}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={!editing}
              className={sharedStyles.input}
              style={{ backgroundColor: editing ? '#FFFFFC' : '#f5f5f5' }}
            />
          </div>

          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              disabled={!editing}
              className={sharedStyles.input}
              style={{ backgroundColor: editing ? '#FFFFFC' : '#f5f5f5' }}
            />
          </div>

          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              disabled={!editing}
              className={sharedStyles.input}
              style={{ backgroundColor: editing ? '#FFFFFC' : '#f5f5f5' }}
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className={sharedStyles.primaryButton}
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button onClick={handleSave} className={sharedStyles.primaryButton}>
                Save Changes
              </button>
              <button onClick={() => setEditing(false)} className={sharedStyles.secondaryButton}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}