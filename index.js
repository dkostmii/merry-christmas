// Define the full note scale (C0 to B8, including sharps)
const noteFrequencies = (() => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const scale = {};
    for (let octave = 0; octave <= 8; octave++) {
        notes.forEach((note, index) => {
            const frequency = 440 * Math.pow(2, (octave * 12 + index - 57) / 12);
            scale[`${note}${octave}`] = frequency;
        });
    }
    return scale;
})();

// Tempo and time signature
const BPM = 90; // Beats per minute
const timeSignature = "3/4"; // 3 beats per measure
const [numerator, denominator] = timeSignature.split('/').map(Number);
const beatDuration = 60 / (BPM * denominator); // Duration of a single beat in seconds

// Envelope settings
const envelopeSettings = {
    delay: 0,
    attack: 0.04,
    hold: 0.076,
    decay: 0.264,
    sustain: 0.092,
    release: 0.408,
    maxGain: 0.4, // Maximum volume
};

// Function to apply an envelope to a gain node
function applyEnvelope(audioContext, gainNode, duration) {
    const now = audioContext.currentTime;

    const { delay, attack, hold, decay, sustain, release, maxGain } = envelopeSettings;
    const attackTime = now + delay;
    const holdTime = attackTime + attack;
    const decayTime = holdTime + hold;
    const sustainLevel = sustain * maxGain;
    const endTime = decayTime + decay;
    const releaseTime = endTime + duration;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(maxGain, attackTime);
    gainNode.gain.setValueAtTime(maxGain, holdTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, decayTime);
    gainNode.gain.setValueAtTime(sustainLevel, endTime);
    gainNode.gain.linearRampToValueAtTime(0, releaseTime);
    return releaseTime; // Return the total duration for cleanup
}

// Function to play a single note or silence for a given duration
function playNote(note, durationInBeats, audioContext, destination) {
    return new Promise((resolve) => {
        const duration = durationInBeats * beatDuration;
        if (note === "silence") {
            setTimeout(() => resolve(), duration * 1000); // Silence, just wait
            return;
        }

        const frequency = noteFrequencies[note];
        if (!frequency) {
            console.error(`Invalid note: ${note}`);
            resolve();
            return;
        }

        const gainNode = audioContext.createGain();
        gainNode.connect(destination);

        const harmonics = [1, 2, 4]; // Harmonics for the organ effect
        const oscillators = harmonics.map((harmonic) => {
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.setValueAtTime(frequency * harmonic, audioContext.currentTime);
            oscillator.type = "sine";
            oscillator.connect(gainNode);
            return oscillator;
        });

        const totalDuration = applyEnvelope(audioContext, gainNode, duration);
        oscillators.forEach((oscillator) => oscillator.start());
        oscillators.forEach((oscillator) => oscillator.stop(totalDuration));

        setTimeout(() => {
            oscillators.forEach((oscillator) => oscillator.disconnect());
            gainNode.disconnect();
            resolve();
        }, duration * 1000);
    });
}

// Define the song
const song = [
    // 1st bar
    ["G5", 1], ["silence", 1], ["G5", 1],
    ["A5", 1], ["G5", 1], ["F#5", 1], ["E5", 2],
    ["E5", 1], ["silence", 1], ["E5", 2],

    // 2nd bar
    ["A5", 1], ["silence", 1], ["A5", 1],
    ["B5", 1], ["A5", 1], ["G#5", 1], ["F#5", 2],
    ["F#5", 1], ["silence", 1], ["F#5", 2],

    // 3rd bar
    ["B5", 1], ["silence", 1], ["B5", 1],
    ["C#5", 1], ["B5", 1], ["A5", 1], ["G5", 2],
    ["E5", 1], ["silence", 1], ["B4", 1], ["C#5", 1],

    // 4th bar
    ["D#5", 1], ["silence", 1], ["A5", 1], ["silence", 1],
    ["F5", 1], ["silence", 1], ["G5", 2],
    ["silence", 2], ["C#5", 2],
];

// Function to play the entire song
async function playSongWithOrgan(audioContext, destination) {
    for (const [note, duration] of song) {
        await playNote(note, duration, audioContext, destination);
    }
    console.log("Song playback finished");
}

document.getElementById('play-trigger').addEventListener('click', () => {
    document.getElementById('play-trigger').disabled = true;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().then(() => {
        // Call the function to play the song
        return playSongWithOrgan(audioContext, audioContext.destination);
    }).then(() => {
        document.getElementById('play-trigger').disabled = false;
    });
});